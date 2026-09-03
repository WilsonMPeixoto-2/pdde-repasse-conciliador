import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/pddeinfo-html.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const sourceUrl = 'https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar/ano/2026/co_escola/33069247/cnpj//co_esfera_adm/2/sg_uf/RJ/co_municipio_fnde/330455/consultar/Consultar/page/1';

const expectedSchool = {
  inep: '33069247',
  sme: '0410001',
  nome: 'EM EMA NEGRAO DE LIMA',
};

const html = `<!doctype html>
<html lang="pt-BR">
  <body>
    <h2>Dados da Escola</h2>
    <table class="dados-escola">
      <tbody>
        <tr>
          <td>Cod. Escola:</td><td>33069247</td>
          <td>Nome Escola:</td><td>0410001 EM EMA NEGRAO DE LIMA</td>
        </tr>
      </tbody>
    </table>

    <h2>Unidade Executora Própria (UEx)</h2>
    <table class="uex">
      <tbody>
        <tr>
          <td>Executora:</td><td>CAIXA ESCOLAR DA EM EMA NEGRAO DE LIMA</td>
          <td>CNPJ:</td><td>04.552.825/0001-70</td>
        </tr>
      </tbody>
    </table>

    <h2>Dados Bancários</h2>
    <table class="contas">
      <thead>
        <tr><th>Programa/Ação</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Saldo</th><th>Ocorrência</th></tr>
      </thead>
      <tbody>
        <tr><td>PDDE QUALIDADE</td><td>001</td><td>0249</td><td>0000546402</td><td>6.519,04</td><td></td></tr>
        <tr><td>PDDE</td><td>001</td><td>0249</td><td>00012345X</td><td>23,29</td><td></td></tr>
      </tbody>
    </table>

    <h2>Repasses</h2>
    <table class="financeiro">
      <thead>
        <tr>
          <th>Destinação</th>
          <th>Vl Devido Custeio</th><th>Vl Devido Capital</th><th>Vl Devido Total</th>
          <th>Vl Ajuste Custeio</th><th>Vl Ajuste Capital</th><th>Vl Ajuste Total</th>
          <th>Vl Final Devido Total</th>
          <th>Vl Pago Custeio</th><th>Vl Pago Capital</th><th>Valor Pago Total</th>
          <th>Data Ord. Pagamento</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>PDDE / PDDE Básico - 1ª Parcela</td>
          <td>4.000,00</td><td>1.000,00</td><td>5.000,00</td>
          <td>50,00</td><td>15,00</td><td>65,00</td><td>5.065,00</td>
          <td>4.050,00</td><td>1.015,00</td><td>5.065,00</td><td>05/08/2026</td>
        </tr>
        <tr>
          <td>PDDE / PDDE Básico - 2ª Parcela</td>
          <td>0,00</td><td>0,00</td><td>0,00</td>
          <td>0,00</td><td>0,00</td><td>0,00</td><td>0,00</td>
          <td>0,00</td><td>0,00</td><td>0,00</td><td></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;

async function parse(rawHtml = html, school = expectedSchool) {
  const subject = await loadSubject();
  expect(subject, 'o parser HTML do PDDEInfo ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.parsePddeInfoSchoolHtml).toBeTypeOf('function');
  return (subject.parsePddeInfoSchoolHtml as (
    htmlSource: string,
    options: Record<string, unknown>,
  ) => Record<string, unknown>)(rawHtml, {
    expectedSchool: school,
    sourceUrl,
  });
}

describe('parsePddeInfoSchoolHtml', () => {
  test('extrai identidade, UEx, contas e financeiro sem perder identificadores textuais', async () => {
    const result = await parse();

    expect(result).toEqual({
      inep: '33069247',
      sme: '0410001',
      nome: 'EM EMA NEGRAO DE LIMA',
      denominacaoFnde: '0410001 EM EMA NEGRAO DE LIMA',
      uex: 'CAIXA ESCOLAR DA EM EMA NEGRAO DE LIMA',
      cnpj: '04.552.825/0001-70',
      accounts: [
        {
          programa: 'PDDE QUALIDADE',
          banco: '001',
          agencia: '0249',
          conta: '0000546402',
          saldo: '6.519,04',
          ocorrencia: '',
        },
        {
          programa: 'PDDE',
          banco: '001',
          agencia: '0249',
          conta: '00012345X',
          saldo: '23,29',
          ocorrencia: '',
        },
      ],
      finance: [
        {
          destinacao: 'PDDE / PDDE Básico - 1ª Parcela',
          devidoCusteio: '4.000,00',
          devidoCapital: '1.000,00',
          devidoTotal: '5.000,00',
          ajusteCusteio: '50,00',
          ajusteCapital: '15,00',
          ajusteTotal: '65,00',
          finalDevidoTotal: '5.065,00',
          pagoCusteio: '4.050,00',
          pagoCapital: '1.015,00',
          pagoTotal: '5.065,00',
          data: '05/08/2026',
        },
        {
          destinacao: 'PDDE / PDDE Básico - 2ª Parcela',
          devidoCusteio: '0,00',
          devidoCapital: '0,00',
          devidoTotal: '0,00',
          ajusteCusteio: '0,00',
          ajusteCapital: '0,00',
          ajusteTotal: '0,00',
          finalDevidoTotal: '0,00',
          pagoCusteio: '0,00',
          pagoCapital: '0,00',
          pagoTotal: '0,00',
          data: '',
        },
      ],
      status: {
        uexRegistration: '',
        mandate: '',
        mandateStartDate: '',
        mandateEndDate: '',
        uexAccounting: '',
        eexAdhesion: '',
        eexAccounting: '',
      },
      source: sourceUrl,
      sourceIdentity: {
        inep: '33069247',
        sme: '0410001',
        denominacao: '0410001 EM EMA NEGRAO DE LIMA',
      },
    });
  });

  test('rejeita resposta cuja identidade não corresponde ao INEP solicitado', async () => {
    const wrongSchool = html.replaceAll('33069247', '33069093');
    await expect(parse(wrongSchool)).rejects.toThrow(/INEP.*diverge|identidade.*diverge/i);
  });

  test('rejeita página sem tabela financeira em vez de produzir coleta aparentemente vazia', async () => {
    const withoutFinance = html.replace(/<table class="financeiro">[\s\S]*?<\/table>/, '');
    await expect(parse(withoutFinance)).rejects.toThrow(/financeir|destina/i);
  });
});
