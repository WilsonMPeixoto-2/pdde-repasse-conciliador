import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parseSigefMovementCsv } from '../../backend/adapters/sigef-movements-csv';
import { normalizePddeInfoSchools } from '../../backend/adapters/pddeinfo-normalizer';
import { parseSigefReleaseHtml } from '../../backend/adapters/sigef-releases-html';

const realCsvPath = process.env.SIGEF_REAL_CSV;
const pddeInfoJsonPath = process.env.PDDEINFO_REAL_JSON;
const hasRealInputs = Boolean(
  realCsvPath
  && pddeInfoJsonPath
  && existsSync(realCsvPath)
  && existsSync(pddeInfoJsonPath),
);
const releaseHtmlPath = process.env.SIGEF_RELEASE_REAL_XLS;

describe.skipIf(!hasRealInputs)('SIGEF — arquivo oficial completo', () => {
  test('processa a base nacional em fluxo e retém somente os CNPJs da 4ª CRE', async () => {
    if (!realCsvPath || !pddeInfoJsonPath) throw new Error('caminhos reais ausentes');
    const current = JSON.parse(readFileSync(pddeInfoJsonPath, 'utf8')) as {
      schools: Array<{ cnpj: string }>;
    };
    const targets = new Set(current.schools.map((school) => school.cnpj.replace(/\D/g, '')));
    const rssBefore = process.memoryUsage().rss;
    const startedAt = performance.now();

    const result = await parseSigefMovementCsv(createReadStream(realCsvPath), {
      targetCnpjs: [...targets],
      programCodes: ['02'],
      queriedAt: '2026-08-11T23:30:00-03:00',
      requestedThrough: '2026-08-31',
    });

    const elapsedSeconds = (performance.now() - startedAt) / 1_000;
    const rssGrowthMiB = (process.memoryUsage().rss - rssBefore) / 1_048_576;
    expect(result.statistics.rowsRead).toBeGreaterThan(400_000);
    expect(result.movements.length).toBeGreaterThan(100);
    expect(result.movements.every((movement) => targets.has(movement.schoolCnpj))).toBe(true);
    expect(result.source.coverageThrough).toMatch(/^2026-0[1-8]-\d{2}$/);
    expect(result.statistics.coverageLagDays).toBeGreaterThan(0);
    expect(elapsedSeconds).toBeLessThan(60);
    expect(rssGrowthMiB).toBeLessThan(250);

    console.info(JSON.stringify({
      elapsedSeconds: Number(elapsedSeconds.toFixed(3)),
      rssGrowthMiB: Number(rssGrowthMiB.toFixed(1)),
      movements: result.movements.length,
      uniqueUex: new Set(result.movements.map((movement) => movement.schoolCnpj)).size,
      orderBankCredits: result.movements.filter(
        (movement) => movement.operation === 'credit' && movement.history === 'ORDEM BANCARIA',
      ).length,
      source: result.source,
      statistics: result.statistics,
    }));
  }, 60_000);
});

describe.skipIf(!pddeInfoJsonPath || !existsSync(pddeInfoJsonPath))('PDDEInfo — 163 respostas atuais', () => {
  test('normaliza todos os registros atuais sem completar contas ausentes', () => {
    if (!pddeInfoJsonPath) throw new Error('caminho real do PDDEInfo ausente');
    const current = JSON.parse(readFileSync(pddeInfoJsonPath, 'utf8')) as {
      schools: unknown[];
    };

    const result = normalizePddeInfoSchools(current.schools, {
      fiscalYear: 2026,
      queriedAt: '2026-08-11T23:45:00-03:00',
    });

    expect(result.statistics).toMatchObject({
      schools: 163,
      financialRecords: 520,
      missingProgramAccounts: 47,
      ignoredZeroRecords: 0,
    });
    expect(result.payments).toHaveLength(520);
    expect(new Set(result.payments.map((payment) => payment.school.inep)).size).toBe(163);
    expect(result.warnings).toEqual([]);
  });
});

describe.skipIf(!releaseHtmlPath || !existsSync(releaseHtmlPath))('SIGEF — XLS-HTML oficial de Liberações', () => {
  test('interpreta diretamente o arquivo oficial exportado', () => {
    if (!releaseHtmlPath) throw new Error('caminho real de Liberações ausente');
    const result = parseSigefReleaseHtml(readFileSync(releaseHtmlPath), {
      fiscalYear: 2018,
      programCode: '02',
      targetCnpjs: ['48425714000178'],
      sourceUrl: 'https://www.fnde.gov.br/sigefweb/liberacoes/exemplo',
    });

    expect(result.statistics).toEqual({ releaseRows: 2, tables: 1 });
    expect(result.releases.map((release) => ({
      date: release.paymentDate,
      orderBank: release.orderBank,
      amountCents: release.amountCents,
      installmentCode: release.installmentCode,
      account: release.destinationAccount.number,
    }))).toEqual([
      { date: '2018-09-21', orderBank: '826912', amountCents: 1_132_000, installmentCode: '2', account: '000023835X' },
      { date: '2018-05-09', orderBank: '808533', amountCents: 1_132_000, installmentCode: '1', account: '000023835X' },
    ]);
  });
});
