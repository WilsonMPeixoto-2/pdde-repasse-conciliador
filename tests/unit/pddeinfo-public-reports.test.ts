import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/pddeinfo-public-reports.ts', import.meta.url).href;

async function subject(): Promise<Record<string, any> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, any>;
  } catch {
    return null;
  }
}

const attendanceHtml = `
<html><body><table>
<tr><th>Ano</th><th>Nome Escola</th><th>Código Escola</th><th>CNPJ Executora</th><th>Programa</th><th>Destinação</th><th>Valor Total</th><th>Data da Ord. de Pagamento</th></tr>
<tr><td>2026</td><td>0410001 EM EMA NEGRAO DE LIMA</td><td>33069247</td><td>04500463000173</td><td>PDDE</td><td>PDDE Básico - 1ª Parcela</td><td>4.185,00</td><td>04/08/2026</td></tr>
</table></body></html>`;

const transientOracleHtml = `
<html><body>SQLSTATE[HY000]: OCISessionBegin: ORA-02391: limite de SESSIONS_PER_USER simultâneo excedido</body></html>`;

describe('relatórios públicos PDDEInfo', () => {
  test('constrói consulta 2026 de atendimento por INEP sem navegador', async () => {
    const mod = await subject();
    expect(mod, 'adapter ainda não implementado').not.toBeNull();
    if (!mod) return;
    const url = new URL(mod.buildPddeInfoPublicReportUrl({
      kind: 'ATTENDANCE', fiscalYear: 2026, inep: '33069247', uf: 'RJ', administrationSphere: 2,
    }));
    expect(url.searchParams.get('ano')).toBe('2026');
    expect(url.searchParams.get('co_escola')).toBe('33069247');
    expect(url.searchParams.getAll('co_esfera_adm[]')).toContain('2');
    expect(url.searchParams.getAll('siglaUf[]')).toContain('RJ');
    expect(url.searchParams.get('tpRelatorio')).toBe('1');
  });

  test('constrói consulta de saldo com mês de cobertura e CNPJ', async () => {
    const mod = await subject();
    expect(mod, 'adapter ainda não implementado').not.toBeNull();
    if (!mod) return;
    const url = new URL(mod.buildPddeInfoPublicReportUrl({
      kind: 'BALANCE', month: '06-2026', cnpj: '04500463000173', uf: 'RJ', administrationSphere: 2,
    }));
    expect(url.searchParams.get('mes')).toBe('06-2026');
    expect(url.searchParams.get('cnpj')).toBe('04500463000173');
  });

  test('extrai tabela como evidência estruturada sem reinterpretar valores monetários', async () => {
    const mod = await subject();
    expect(mod, 'adapter ainda não implementado').not.toBeNull();
    if (!mod) return;
    const parsed = mod.parsePddeInfoPublicReport(attendanceHtml, 'ATTENDANCE');
    expect(parsed.headers).toContain('CNPJ Executora');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      Ano: '2026',
      'Código Escola': '33069247',
      'CNPJ Executora': '04500463000173',
      'Valor Total': '4.185,00',
      'Data da Ord. de Pagamento': '04/08/2026',
    });
  });

  test('erro SQL/Oracle do próprio FNDE vira falha explícita da fonte', async () => {
    const mod = await subject();
    expect(mod, 'adapter ainda não implementado').not.toBeNull();
    if (!mod) return;
    expect(() => mod.parsePddeInfoPublicReport(
      '<html><body>SQLSTATE[HY000]: General error: 904 OCIStmtExecute: ORA-00904 invalid identifier</body></html>',
      'ACCOUNT_OPENING',
    )).toThrow(/FNDE|ORA-00904|fonte/i);
  });

  test('repete HTTP quando o FNDE esgota temporariamente as sessões Oracle', async () => {
    const mod = await subject();
    expect(mod, 'adapter ainda não implementado').not.toBeNull();
    if (!mod) return;

    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return new Response(calls === 1 ? transientOracleHtml : attendanceHtml, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    };

    const result = await mod.fetchPddeInfoPublicReport({
      filter: { kind: 'ATTENDANCE', fiscalYear: 2026, inep: '33069247' },
      fetchImpl,
      browserFallback: false,
      maxHttpAttempts: 2,
      retryDelayMs: 0,
    });

    expect(calls).toBe(2);
    expect(result.via).toBe('HTTP');
    expect(result.rows).toHaveLength(1);
  });
});
