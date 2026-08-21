import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { packageHumanFinancialSnapshot } from '../../scripts/package-human-financial-snapshot';
import type { HumanFinancialPortfolioView } from '../../backend/application/build-human-financial-view';

const position = {
  referenceDate: '2026-06-30',
  checkingBalanceCents: 100_000,
  applications: { fundsCents: 200_000, savingsCents: 0, rdbCdbCents: 0, totalCents: 200_000 },
  totalReportedBalanceCents: 300_000,
};

const human: HumanFinancialPortfolioView = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  metrics: {
    schoolCount: 1,
    accountsTotal: 1,
    accountsWithPosition: 1,
    programmedCents: 100_000,
    paymentInformedCents: 100_000,
    creditLocatedCents: 100_000,
    reportedBalanceCents: 300_000,
    applicationsCents: 200_000,
  },
  sources: [{ name: 'PDDEInfo', information: 'Fonte pública de teste.' }],
  indicators: [],
  schools: [{
    school: {
      inep: '33069409', sme: '0410006', name: 'EM PROFESSOR CARNEIRO RIBEIRO',
      uex: 'CONSELHO ESCOLA COMUNIDADE', cnpj: '05406794000101',
    },
    programs: [{
      name: 'PDDE Básico',
      installments: [{
        installment: '1ª Parcela', programmedCents: 100_000, paymentInformedCents: 100_000,
        paymentInformedDate: '2026-04-30', paymentOrderDate: '2026-04-30',
        account: { bank: '001', agency: '0249', number: '0000549827' },
        creditEvidence: { status: 'Crédito localizado', date: '2026-05-03', amountCents: 100_000, document: 'DOC1' },
        note: null,
      }],
    }],
    accounts: [{
      program: 'PDDE Básico', bank: '001', agency: '0249', account: '0000549827',
      positions: [position], latestPosition: position,
      movements: [{
        date: '2026-05-03', description: 'ORDEM BANCARIA', document: 'DOC1', category: 'Repasse FNDE',
        kind: 'FNDE_CREDIT', creditCents: 100_000, debitCents: null, counterparty: null,
      }],
      coverage: {
        positionCount: 1, firstPositionDate: '2026-06-30', latestPositionDate: '2026-06-30',
        movementCollectionStatus: 'COMPLETE', latestMovementDate: '2026-05-03',
      },
      activity: {
        movementCount: 1, creditsObservedCents: 100_000, debitsObservedCents: 0,
        fndeCreditsCents: 100_000, applicationsCents: 0, redemptionsCents: 0,
        paymentsAndTransfersCents: 0, financialIncomeCents: 0, thirdPartyEntriesCents: 0,
        bankFeesCents: 0, otherCreditsCents: 0, otherDebitsCents: 0,
      },
      contextFlags: [], note: null,
    }],
    accounting: [], followUp: [],
  }],
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

describe('empacotador do retrato humano publicado', () => {
  it('produz snapshot e workbook determinísticos e identifica partes obsoletas sem removê-las', async () => {
    const first = await mkdtemp(join(tmpdir(), 'pdde-package-a-'));
    const second = await mkdtemp(join(tmpdir(), 'pdde-package-b-'));
    const staleName = 'pdde-2026-snapshot.part99.txt';
    await writeFile(join(first, staleName), 'parte-antiga', 'utf8');
    await writeFile(join(second, staleName), 'parte-antiga', 'utf8');

    const options = {
      human,
      runId: 'run-2026-fixture-001',
      expectedSchoolCount: 1,
      source: { workflowRunId: 123, artifactId: 456, artifactName: 'fixture-2026' },
      generatedAt: '2026-08-21T20:00:00.000Z',
      partSize: 80,
    } as const;

    const a = await packageHumanFinancialSnapshot({ ...options, outputDir: first });
    const b = await packageHumanFinancialSnapshot({ ...options, outputDir: second });

    expect(a.payloadSha256).toBe(b.payloadSha256);
    expect(a.compressedSha256).toBe(b.compressedSha256);
    expect(a.workbookSha256).toBe(b.workbookSha256);
    expect(a.partCount).toBeGreaterThan(1);
    expect(a.staleParts).toEqual([`/data/${staleName}`]);
    expect(b.staleParts).toEqual(a.staleParts);

    const manifestA = await readFile(join(first, 'pdde-2026-snapshot.json'), 'utf8');
    const manifestB = await readFile(join(second, 'pdde-2026-snapshot.json'), 'utf8');
    expect(manifestA).toBe(manifestB);
    const manifest = JSON.parse(manifestA) as {
      staleParts: string[];
      checksums: { workbookSha256: string };
      workbook: { path: string; generatedFromSameHumanContract: boolean };
    };
    expect(manifest.staleParts).toEqual([`/data/${staleName}`]);
    expect(manifest.workbook).toEqual({
      path: '/data/inteligencia-financeira-pdde-4cre-2026.xlsx',
      filename: 'inteligencia-financeira-pdde-4cre-2026.xlsx',
      generatedFromSameHumanContract: true,
    });

    const partNames = (await readdir(first))
      .filter((name) => name.startsWith('pdde-2026-snapshot.part') && name !== staleName)
      .sort();
    expect(partNames).toHaveLength(a.partCount);
    for (const name of partNames) {
      expect(await readFile(join(first, name), 'utf8')).toBe(await readFile(join(second, name), 'utf8'));
    }

    const workbookA = await readFile(join(first, 'inteligencia-financeira-pdde-4cre-2026.xlsx'));
    const workbookB = await readFile(join(second, 'inteligencia-financeira-pdde-4cre-2026.xlsx'));
    expect(workbookA.equals(workbookB)).toBe(true);
    expect(manifest.checksums.workbookSha256).toBe(sha256(workbookA));
    expect(await readFile(join(first, staleName), 'utf8')).toBe('parte-antiga');
  });
});
