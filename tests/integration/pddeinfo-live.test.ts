import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { fetchPddeInfoSchoolHtml } from '../../backend/adapters/pddeinfo-http';
import { parsePddeInfoSchoolHtml } from '../../backend/adapters/pddeinfo-html';
import { normalizePddeInfoSchools } from '../../backend/adapters/pddeinfo-normalizer';

const live = process.env.PDDEINFO_LIVE === '1';
const liveTest = live ? test : test.skip;

const expectedSchool = {
  inep: '33069247',
  sme: '0410001',
  nome: 'EM EMA NEGRAO DE LIMA',
};

describe('PDDEInfo público — integração opt-in', () => {
  liveTest('consulta, preserva, interpreta e normaliza uma escola real da 4ª CRE', async () => {
    const response = await fetchPddeInfoSchoolHtml({
      fiscalYear: 2026,
      inep: expectedSchool.inep,
      maxAttempts: 4,
      timeoutMs: 25_000,
    });

    expect(response.httpStatus).toBe(200);
    expect(response.rawBytes).toBeDefined();
    expect(response.rawBytes?.byteLength).toBe(response.responseBytes);
    expect(createHash('sha256').update(response.rawBytes!).digest('hex')).toMatch(/^[a-f0-9]{64}$/);

    const parsed = parsePddeInfoSchoolHtml(response.html, {
      expectedSchool,
      sourceUrl: response.sourceUrl,
    });
    expect(parsed).toMatchObject({
      inep: expectedSchool.inep,
      sme: expectedSchool.sme,
      nome: expectedSchool.nome,
    });
    expect(parsed.cnpj).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
    expect(parsed.finance.length).toBeGreaterThan(0);

    const normalized = normalizePddeInfoSchools([parsed], {
      fiscalYear: 2026,
      queriedAt: response.queriedAt,
    });
    expect(normalized.statistics.schools).toBe(1);
    expect(normalized.payments.length).toBeGreaterThan(0);
  }, 60_000);
});
