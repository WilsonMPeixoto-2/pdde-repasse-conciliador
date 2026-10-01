import ExcelJS from 'exceljs';
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

  test('mapeia a versão atual e as APIs auxiliares do layout GOV.BR', async () => {
    const mod = await subject();
    expect(mod).not.toBeNull();
    if (!mod) return;

    expect(mod.parsePddeInfoPlatformVersion('<title>FNDE: PDDE Info 18.09.2026#83f77b</title>')).toEqual({
      version: '18.09.2026#83f77b',
      releasedOn: '18.09.2026',
      revision: '83f77b',
    });
    expect(mod.buildPddeInfoMunicipalitiesApiUrl('rj')).toContain('corp/get-municipio?sg_uf=RJ');
    expect(mod.buildPddeInfoDestinationsApiUrl({ fiscalYear: 2026, programCode: '02' }))
      .toContain('/sae/get-destinacao/ano/2026/programa/02');
  });

  test('constrói exportação municipal em lote com os filtros oficiais atuais', async () => {
    const mod = await subject();
    expect(mod).not.toBeNull();
    if (!mod) return;
    const url = new URL(mod.buildPddeInfoBulkAttendanceExcelUrl({
      fiscalYear: 2026,
      uf: 'RJ',
      administrationSphere: 2,
      municipalityFndeCode: '330455',
      programCode: '02',
    }));
    expect(url.hostname).toBe('webservice.fnde.gov.br');
    expect(url.pathname).toContain('/situacaoatendimentoentidade/situacaoatendimentoentidade/excel');
    expect(url.searchParams.get('an_exercicio')).toBe('2026');
    expect(url.searchParams.get('co_escola')).toBe('');
    expect(url.searchParams.get('sg_uf')).toBe('RJ');
    expect(url.searchParams.get('esferaAdm')).toBe("'2'");
    expect(url.searchParams.get('co_municipio_fnde')).toBe('330455');
    expect(url.searchParams.get('programas')).toBe('02');
    expect(url.searchParams.get('stpg')).toBe("'1'");
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

  test('extrai cards GOV.BR do layout PDDEInfo 18/09 sem fingir tabela vazia', async () => {
    const mod = await subject();
    expect(mod).not.toBeNull();
    if (!mod) return;
    const html = `
      <div class="govbr-results-card-list">
        <div class="govbr-report-card">
          <div class="govbr-report-card-header"><h2>0410601 CM MANGUINHOS</h2><span class="year">2026</span></div>
          <div class="govbr-report-card-item"><span class="label">Código</span><span class="value">33136947</span></div>
          <div class="govbr-report-card-item"><span class="label">Programa</span><span class="value">PDDE</span></div>
          <div class="govbr-report-card-item"><span class="label">CNPJ Executora UEx</span><span class="value">12558497000147</span></div>
          <div class="govbr-report-card-item"><span class="label">Situação PC UEx</span><span class="value">Adimplente</span></div>
          <div class="govbr-report-card-item"><span class="label">Suspensão UEx</span><span class="value">NAO</span></div>
          <div class="govbr-report-card-item"><span class="label">Valor Total Previsto</span><span class="value">R$ 5.550,00</span></div>
        </div>
      </div>`;
    const parsed = mod.parsePddeInfoPublicReport(html, 'ACCOUNTING');
    expect(parsed.rows).toEqual([expect.objectContaining({
      Ano: '2026',
      Código: '33136947',
      Programa: 'PDDE',
      'CNPJ Executora UEx': '12558497000147',
      'Situação PC UEx': 'Adimplente',
      'Valor Total Previsto': 'R$ 5.550,00',
    })]);
  });

  test('aceita também o HTML tabular entregue pela rota de Excel do FNDE', async () => {
    const mod = await subject();
    expect(mod).not.toBeNull();
    if (!mod) return;
    const html = `
      <table><tbody>
        <tr><td>Ministério da Educação - MEC</td></tr>
        <tr>
          <td>Ano</td><td>Região</td><td>UF</td><td>Município</td><td>Código Município IBGE</td>
          <td>CNPJ Município/SEDUC</td><td>Nome Escola</td><td>Código Escola</td><td>Rede de Ensino</td>
          <td>Quantidade Alunos</td><td>CNPJ Executora</td><td>Nome Executora</td><td>Programa</td>
          <td>Destinação</td><td>Valor Custeio</td><td>Valor Capital</td><td>Valor Total</td>
          <td>Data da Ord. de Pagamento</td>
        </tr>
        <tr>
          <td>2026</td><td>SUDESTE</td><td>RJ</td><td>RIO DE JANEIRO</td><td>3304557</td>
          <td>42498733000148</td><td>0410601 CM MANGUINHOS</td><td>33136947</td>
          <td>ADMINISTRAÇÃO PÚBLICA MUNICIPAL</td><td>185</td><td>12558497000147</td>
          <td>CEC MANGUINHOS</td><td>PDDE</td><td>PDDE Básico - Primeira Infância - P2</td>
          <td>1.110,00</td><td>1.665,00</td><td>2.775,00</td><td>14/09/2026</td>
        </tr>
      </tbody></table>`;
    const parsed = await mod.parsePddeInfoAttendanceExport(
      new TextEncoder().encode(html),
      'text/html; charset=UTF-8',
    );
    expect(parsed.rows).toEqual([expect.objectContaining({
      'Código Escola': '33136947',
      Destinação: 'PDDE Básico - Primeira Infância - P2',
      'Data da Ord. de Pagamento': '14/09/2026',
    })]);
  });

  test('lê o XLSX oficial de atendimento preservando destinação e data por parcela', async () => {
    const mod = await subject();
    expect(mod).not.toBeNull();
    if (!mod) return;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Atendimento');
    sheet.addRow(['Ministério da Educação']);
    sheet.addRow([]);
    sheet.addRow([
      'Ano', 'Região', 'UF', 'Município', 'Código Município IBGE', 'CNPJ Município/SEDUC',
      'Nome Escola', 'Código Escola', 'Rede de Ensino', 'Quantidade Alunos', 'CNPJ Executora',
      'Nome Executora', 'Programa', 'Destinação', 'Valor Custeio', 'Valor Capital', 'Valor Total',
      'Data da Ord. de Pagamento',
    ]);
    sheet.addRow([
      2026, 'SUDESTE', 'RJ', 'RIO DE JANEIRO', '3304557', '42498733000148',
      '0410601 CM MANGUINHOS', '33136947', 'ADMINISTRAÇÃO PÚBLICA MUNICIPAL', 185,
      '12558497000147', 'CEC MANGUINHOS', 'PDDE', 'PDDE Básico - Primeira Infância - P2',
      '1.110,00', '1.665,00', '2.775,00', '14/09/2026',
    ]);
    const bytes = await workbook.xlsx.writeBuffer();
    const parsed = await mod.parsePddeInfoAttendanceWorkbook(new Uint8Array(bytes));
    expect(parsed.rows).toEqual([expect.objectContaining({
      'Código Escola': '33136947',
      'Destinação': 'PDDE Básico - Primeira Infância - P2',
      'Data da Ord. de Pagamento': '14/09/2026',
    })]);
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

  test('constrói consultas públicas de cadastro, abertura de conta e suspensão por INEP', async () => {
    const mod = await subject();
    expect(mod).not.toBeNull();
    if (!mod) return;

    const registration = new URL(mod.buildPddeInfoPublicReportUrl({
      kind: 'REGISTRATION', fiscalYear: 2026, inep: '33069247', uf: 'RJ', administrationSphere: 2,
    }));
    expect(registration.pathname).toContain('situacaocadastroentidade');
    expect(registration.searchParams.get('tp_relatorio')).toBe('1');
    expect(registration.searchParams.get('co_escola')).toBe('33069247');

    const opening = new URL(mod.buildPddeInfoPublicReportUrl({
      kind: 'ACCOUNT_OPENING', fiscalYear: 2026, inep: '33069247', uf: 'RJ', administrationSphere: 2,
    }));
    expect(opening.pathname).toContain('staberturacontaentidade');

    const suspension = new URL(mod.buildPddeInfoPublicReportUrl({
      kind: 'SUSPENSION', fiscalYear: 2026, inep: '33069247', uf: 'RJ', administrationSphere: 2,
    }));
    expect(suspension.pathname).toContain('relatoriosuspensao');
    expect(suspension.searchParams.getAll('tp_suspensao[]')).toContain('0');
  });
});
