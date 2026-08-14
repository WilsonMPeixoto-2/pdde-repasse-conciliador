import { describe, expect, test } from 'vitest';
import { normalizePddeInfoSchools } from '../../backend/adapters/pddeinfo-normalizer';

describe('PDDEInfo Primeira Infância P2', () => {
  test('normaliza a nova destinação observada no snapshot real de 2026', () => {
    const result = normalizePddeInfoSchools([{
      inep: '33136947',
      sme: '0410601',
      nome: 'EM Exemplo Primeira Infância',
      denominacaoFnde: '0410601 EM EXEMPLO PRIMEIRA INFANCIA',
      uex: 'CONSELHO ESCOLA COMUNIDADE EXEMPLO',
      cnpj: '12.345.678/0001-90',
      accounts: [{
        programa: 'PDDE',
        banco: '001',
        agencia: '0249',
        conta: '000012345X',
        saldo: '1.000,00',
        ocorrencia: '',
      }],
      finance: [{
        destinacao: 'PDDE / PDDE Básico - Primeira Infância - P2',
        devidoCusteio: '1.110,00',
        devidoCapital: '1.665,00',
        devidoTotal: '2.775,00',
        ajusteCusteio: '0,00',
        ajusteCapital: '0,00',
        ajusteTotal: '0,00',
        finalDevidoTotal: '2.775,00',
        pagoCusteio: '0,00',
        pagoCapital: '0,00',
        pagoTotal: '0,00',
        data: '',
      }],
      source: 'https://www.fnde.gov.br/pddeinfo/exemplo',
      sourceIdentity: {
        inep: '33136947',
        sme: '0410601',
        denominacao: '0410601 EM EXEMPLO PRIMEIRA INFANCIA',
      },
    }], {
      fiscalYear: 2026,
      queriedAt: '2026-08-14T05:00:00Z',
    });

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0]).toMatchObject({
      id: 'PDDEINFO:33136947:2026:PDDE_PRIMEIRA_INFANCIA:P2',
      programCode: '02',
      programName: 'PDDE',
      actionCode: 'PDDE_PRIMEIRA_INFANCIA',
      actionName: 'PDDE Básico — Primeira Infância',
      installmentCode: 'P2',
      installmentLabel: 'P2',
      amountOriginalDueCents: 277_500,
      amountFinalDueCents: 277_500,
      amountPaidCents: 0,
      account: { bank: '001', agency: '0249', number: '000012345X' },
    });
  });
});
