import { describe, expect, test, vi } from 'vitest';
import { collectPddeInfoSchoolWithFallback } from '../../backend/application/collect-pddeinfo-school-with-fallback';

const school = {
  inep: '33069247',
  sme: '0410001',
  nome: 'EM EMA NEGRAO DE LIMA',
};

function financeTable(): string {
  return `
    <table>
      <tr>
        <th>Destinação</th>
        <th>Vl Devido Custeio</th><th>Vl Devido Capital</th><th>Vl Devido Total</th>
        <th>Vl Ajuste Custeio</th><th>Vl Ajuste Capital</th><th>Vl Ajuste Total</th>
        <th>Vl Final Devido Total</th>
        <th>Vl Pago Custeio</th><th>Vl Pago Capital</th><th>Valor Pago Total</th>
      </tr>
      <tr>
        <td>PDDE Básico - Primeira Infância - P2</td>
        <td>794,00</td><td>1.191,00</td><td>1.985,00</td>
        <td>0,00</td><td>0,00</td><td>0,00</td><td>1.985,00</td>
        <td>794,00</td><td>1.191,00</td><td>1.985,00</td>
      </tr>
    </table>
  `;
}

function currentHtml(inep = school.inep): string {
  return `<!doctype html>
  <html><body>
    <div class="govbr-school-card-body">
      <div class="govbr-subcard">
        <div class="govbr-subcard-title">Dados da escola</div>
        <div class="grid-dados-escola-item">
          <span class="label">Identificação:</span>
          <span class="value">0410001 EM EMA NEGRAO DE LIMA - ${inep}</span>
        </div>
      </div>
      <div class="govbr-subcard">
        <div class="govbr-subcard-title">Unidade Executora Própria (UEx)</div>
        <div class="grid-dados-escola-item"><span class="label">Executora:</span><span class="value">CEC EMA NEGRAO</span></div>
        <div class="grid-dados-escola-item"><span class="label">CNPJ:</span><span class="value">01.234.567/0001-89</span></div>
      </div>
      <div class="govbr-subcard">
        <div class="govbr-subcard-title"><span>PDDE</span><span>Data Ord. Pagamento: 14/09/2026</span></div>
        ${financeTable()}
      </div>
    </div>
  </body></html>`;
}

function legacyHtml(): string {
  return `<!doctype html><html><body>
    <table>
      <tr><td>Cod. Escola</td><td>33069247</td><td>Nome Escola</td><td>0410001 EM EMA NEGRAO DE LIMA</td></tr>
    </table>
    <table>
      <tr><td>Executora</td><td>CEC EMA NEGRAO</td><td>CNPJ</td><td>01.234.567/0001-89</td></tr>
    </table>
    <table>
      <tr><th>Programa/Ação</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Saldo</th></tr>
      <tr><td>PDDE</td><td>001</td><td>1234</td><td>0000123456</td><td>0,00</td></tr>
    </table>
    <table>
      <tr>
        <th>Destinação</th>
        <th>Vl Devido Custeio</th><th>Vl Devido Capital</th><th>Vl Devido Total</th>
        <th>Vl Ajuste Custeio</th><th>Vl Ajuste Capital</th><th>Vl Ajuste Total</th>
        <th>Vl Final Devido Total</th>
        <th>Vl Pago Custeio</th><th>Vl Pago Capital</th><th>Valor Pago Total</th>
        <th>Data Ord. Pagamento</th>
      </tr>
      <tr>
        <td>PDDE / PDDE Básico - 1ª Parcela</td>
        <td>100,00</td><td>0,00</td><td>100,00</td>
        <td>0,00</td><td>0,00</td><td>0,00</td><td>100,00</td>
        <td>100,00</td><td>0,00</td><td>100,00</td><td>01/08/2026</td>
      </tr>
    </table>
  </body></html>`;
}

function httpResult(html: string) {
  return {
    html,
    rawBytes: Buffer.from(html),
    sourceUrl: 'https://www.fnde.gov.br/pddeinfo/escola/33069247',
    queriedAt: '2026-09-18T16:00:00.000Z',
    attempts: 1,
    httpStatus: 200,
    responseBytes: Buffer.byteLength(html),
  };
}

describe('collectPddeInfoSchoolWithFallback', () => {
  test('mantém HTTP como primeira escolha quando o HTML já é utilizável', async () => {
    const fetchBrowser = vi.fn();
    const result = await collectPddeInfoSchoolWithFallback({
      school,
      fiscalYear: 2026,
      fetchHttp: vi.fn(async () => httpResult(legacyHtml())),
      fetchBrowser,
    });

    expect(result.via).toBe('HTTP');
    expect(result.school.inep).toBe(school.inep);
    expect(fetchBrowser).not.toHaveBeenCalled();
  });

  test('usa navegador somente quando o HTTP entrega DOM pré-renderização', async () => {
    const fetchBrowser = vi.fn(async () => ({
      html: currentHtml(),
      sourceUrl: 'https://www.fnde.gov.br/pddeinfo/escola/33069247',
      queriedAt: '2026-09-18T16:01:00.000Z',
    }));

    const result = await collectPddeInfoSchoolWithFallback({
      school,
      fiscalYear: 2026,
      fetchHttp: vi.fn(async () => httpResult('<html><body><div id="app"></div></body></html>')),
      fetchBrowser,
    });

    expect(result.via).toBe('BROWSER_ASSISTED');
    expect(fetchBrowser).toHaveBeenCalledTimes(1);
    expect(fetchBrowser).toHaveBeenCalledWith(expect.objectContaining({
      readySelector: '.govbr-school-card-body',
    }));
    expect(result.school.finance).toHaveLength(1);
    expect(result.school.finance[0]).toMatchObject({
      destinacao: 'PDDE / PDDE Básico - Primeira Infância - P2',
      data: '',
    });
  });

  test('não usa navegador para contornar divergência de identidade', async () => {
    const fetchBrowser = vi.fn();
    await expect(collectPddeInfoSchoolWithFallback({
      school,
      fiscalYear: 2026,
      fetchHttp: vi.fn(async () => httpResult(currentHtml('33099999'))),
      fetchBrowser,
      sleep: async () => undefined,
    })).rejects.toThrow(/INEP.*diverge/i);

    expect(fetchBrowser).not.toHaveBeenCalled();
  });
});
