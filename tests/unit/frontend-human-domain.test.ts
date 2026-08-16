import { describe, expect, it } from 'vitest';
import { humanPortfolioSchema, humanSchoolSchema } from '../../src/product/types';
import { buildAccountTimeline2026, deriveSchoolSummary } from '../../src/product/derive';

const school = {
  fiscalYear: 2026,
  runId: 'monitoring-full-2026',
  school: { inep: '33069093', sme: '0410002', name: 'EM ALBINO SOUZA CRUZ', uex: 'CEC ALBINO', cnpj: '12345678000190' },
  programs: [{
    name: 'PDDE / PDDE Básico',
    installments: [{
      installment: '1ª Parcela', programmedCents: 506500, paymentInformedCents: 506500,
      paymentInformedDate: '2026-08-05', paymentOrderDate: '2026-08-04',
      account: { bank: '001', agency: '0249', number: '0000549797' },
      creditEvidence: { status: 'Crédito localizado', date: '2026-08-06', amountCents: 506500, document: 'OB123' },
      note: null,
    }, {
      installment: '2ª Parcela', programmedCents: 506500, paymentInformedCents: 0,
      paymentInformedDate: null, paymentOrderDate: null,
      account: { bank: '001', agency: '0249', number: '0000549797' },
      creditEvidence: { status: 'Pagamento não informado', date: null, amountCents: null, document: null },
      note: null,
    }],
  }],
  accounts: [{
    program: 'PDDE', bank: '001', agency: '0249', account: '0000549797',
    positions: [
      { referenceDate: '2026-01-31', checkingBalanceCents: 111, applications: { fundsCents: 0, savingsCents: 0, rdbCdbCents: 0, totalCents: 0 }, totalReportedBalanceCents: 111 },
      { referenceDate: '2026-03-31', checkingBalanceCents: 2400, applications: { fundsCents: 100000, savingsCents: 0, rdbCdbCents: 0, totalCents: 100000 }, totalReportedBalanceCents: 102400 },
      { referenceDate: '2026-06-30', checkingBalanceCents: 111, applications: { fundsCents: 415032, savingsCents: 0, rdbCdbCents: 0, totalCents: 415032 }, totalReportedBalanceCents: 415143 },
    ],
    latestPosition: { referenceDate: '2026-06-30', checkingBalanceCents: 111, applications: { fundsCents: 415032, savingsCents: 0, rdbCdbCents: 0, totalCents: 415032 }, totalReportedBalanceCents: 415143 },
    movements: [], note: 'Saldo informado pelo FNDE com posição até 30/06/2026.',
  }],
  accounting: [], followUp: [],
};

const portfolio = {
  title: 'Inteligência Financeira PDDE | 4ª CRE', fiscalYear: 2026, runId: 'monitoring-full-2026',
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026', schoolCount: 1,
  metrics: { schoolCount: 1, accountsTotal: 1, accountsWithPosition: 1, programmedCents: 1013000, paymentInformedCents: 506500, creditLocatedCents: 506500, reportedBalanceCents: 415143, applicationsCents: 415032 },
  sources: [{ name: 'PDDEInfo', information: 'Repasses informados, contas vinculadas, saldos e prestação de contas.' }],
  indicators: [{ label: '1ª parcela com pagamento informado', count: 1, units: [{ sme: '0410002', name: 'EM ALBINO SOUZA CRUZ', inep: '33069093' }] }],
  schools: [{ sme: '0410002', name: 'EM ALBINO SOUZA CRUZ', inep: '33069093' }],
};

describe('domínio humano do frontend', () => {
  it('aceita apenas o contrato humano 2026 e rejeita metadado técnico no topo', () => {
    expect(humanPortfolioSchema.parse(portfolio).metrics.reportedBalanceCents).toBe(415143);
    expect(humanSchoolSchema.parse(school).school.inep).toBe('33069093');
    expect(() => humanPortfolioSchema.parse({ ...portfolio, sourceUrl: 'https://interno' })).toThrow();
    expect(() => humanSchoolSchema.parse({ ...school, technicalClassification: 'X' })).toThrow();
  });

  it('deriva a leitura principal da escola sem transformar ausência em zero', () => {
    expect(deriveSchoolSummary(humanSchoolSchema.parse(school))).toEqual({
      programmedCents: 1013000,
      paymentInformedCents: 506500,
      creditLocatedCents: 506500,
      reportedBalanceCents: 415143,
      applicationsCents: 415032,
      balanceReferenceDate: '2026-06-30',
    });

    const withoutPosition = humanSchoolSchema.parse({
      ...school,
      accounts: [{ ...school.accounts[0], positions: [], latestPosition: null }],
    });
    expect(deriveSchoolSummary(withoutPosition).reportedBalanceCents).toBeNull();
  });

  it('constrói 12 meses e mantém fevereiro ausente diferente de um zero observado', () => {
    const parsed = humanSchoolSchema.parse(school);
    const timeline = buildAccountTimeline2026(parsed.accounts[0].positions);

    expect(timeline).toHaveLength(12);
    expect(timeline[0]).toMatchObject({ month: 1, observed: true, totalReportedBalanceCents: 111 });
    expect(timeline[1]).toMatchObject({ month: 2, observed: false, totalReportedBalanceCents: null });
    expect(timeline[2]).toMatchObject({ month: 3, observed: true, totalReportedBalanceCents: 102400 });

    const zero = buildAccountTimeline2026([{ ...parsed.accounts[0].positions[0], referenceDate: '2026-02-28', totalReportedBalanceCents: 0 }]);
    expect(zero[1]).toMatchObject({ observed: true, totalReportedBalanceCents: 0 });
  });
});
