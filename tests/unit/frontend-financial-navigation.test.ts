import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

const summary = {
  inep: '33000001',
  sme: '0431001',
  name: 'EM Escola Teste',
  programmedCents: 100000,
  paymentInformedCents: 80000,
  creditLocatedCents: 70000,
  knownBalanceCents: 30000,
  referenceDate: '2026-07-31',
  accountsTotal: 1,
  accountsWithReferencePosition: 1,
  paymentSuspended: false,
  repasseAccountMissing: false,
  followUpCount: 0,
  pendingCount: 0,
  registrationAttention: false,
  mandateStatus: null,
  suspensionCount: 0,
  accountOpeningIssueCount: 0,
  accountingAttentionCount: 0,
};

const school = {
  fiscalYear: 2026,
  school: {
    inep: '33000001',
    sme: '0431001',
    name: 'EM Escola Teste',
    uex: 'CEC ESCOLA TESTE',
    cnpj: '12345678000190',
  },
  programs: [{
    name: 'PDDE / PDDE Básico',
    installments: [{
      installment: '1ª Parcela',
      programmedCents: 100000,
      paymentInformedCents: 80000,
      breakdown: {
        programmedCusteioCents: 60000,
        programmedCapitalCents: 40000,
        adjustmentCusteioCents: 0,
        adjustmentCapitalCents: 0,
        paidCusteioCents: 50000,
        paidCapitalCents: 30000,
      },
      paymentInformedDate: '2026-08-05',
      paymentOrderDate: '2026-08-04',
      account: { bank: '001', agency: '0249', number: '0000546402' },
      creditEvidence: { status: 'Crédito localizado', date: '2026-08-05', amountCents: 70000, document: 'DOC123' },
      note: null,
    }],
  }],
  accounts: [{
    program: 'PDDE',
    bank: '001',
    agency: '0249',
    account: '0000546402',
    occurrence: 'Conta ativa',
    positions: [{
      referenceDate: '2026-07-31',
      checkingBalanceCents: 10000,
      applications: { fundsCents: 20000, savingsCents: 0, rdbCdbCents: 0, totalCents: 20000 },
      totalReportedBalanceCents: 30000,
    }],
    latestPosition: {
      referenceDate: '2026-07-31',
      checkingBalanceCents: 10000,
      applications: { fundsCents: 20000, savingsCents: 0, rdbCdbCents: 0, totalCents: 20000 },
      totalReportedBalanceCents: 30000,
    },
    movements: [],
    note: null,
  }],
  registration: null,
  accountOpenings: [{ program: 'PDDE', status: 'Conta aberta', bank: '001', agency: '0249', account: '0000546402' }],
  suspensions: [],
  sourceCoverage: [],
  accounting: [],
  followUp: [],
};

vi.mock('../../src/product/PortfolioContext', () => ({
  usePortfolio: () => ({
    status: 'ready',
    source: 'published',
    refreshing: false,
    refreshError: null,
    refreshProgress: null,
    liveGeneratedAt: null,
    exportingWorkbook: false,
    exportError: null,
    refreshLive: async () => undefined,
    downloadWorkbook: async () => undefined,
    loadSchool: vi.fn(async () => school),
    data: {
      title: 'Inteligência Financeira PDDE | 4ª CRE',
      fiscalYear: 2026,
      referenceLabel: 'Posição financeira pública disponível 31/07/2026',
      schoolCount: 1,
      metrics: {
        schoolCount: 1,
        accountsTotal: 1,
        accountsWithPosition: 1,
        programmedCents: 100000,
        paymentInformedCents: 80000,
        creditLocatedCents: 70000,
        reportedBalanceCents: 30000,
        applicationsCents: 20000,
      },
      sources: [],
      indicators: [],
      schools: [summary],
    },
  }),
}));

vi.mock('../../src/product/usePortfolioSchoolDetails', () => ({
  usePortfolioSchoolDetails: () => ({ status: 'ready', schools: [school], error: null }),
}));

import { AppHeader } from '../../src/product/components/AppHeader';
import { PortfolioSchoolList } from '../../src/product/components/PortfolioSchoolList';
import { BalancesOverviewPage } from '../../src/product/pages/BalancesOverviewPage';
import { RepasseOverviewPage } from '../../src/product/pages/RepasseOverviewPage';
import { PddeBasicOverviewPage } from '../../src/product/pages/PddeBasicOverviewPage';

function renderWithRouter(node: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, node));
}

describe('navegação financeira direta', () => {
  test('cabeçalho expõe as dimensões do produto', () => {
    const html = renderWithRouter(createElement(AppHeader));
    for (const label of [
      'Visão geral',
      'Escolas',
      'Repasses',
      'PDDE Básico',
      'Contas e saldos',
      'Evolução mensal',
      'Movimentações',
      'Cadastro e habilitação',
      'Pendências e suspensões',
      'Prestação de contas',
      'Cobertura das fontes',
    ]) expect(html).toContain(label);

    for (const href of [
      '/unidades', '/repasses', '/pdde-basico', '/saldos', '/evolucao', '/movimentacoes',
      '/cadastro', '/pendencias', '/prestacao-contas', '/cobertura',
    ]) expect(html).toContain(`href="${href}"`);
  });

  test('repasses usa composição de custeio/capital e evidência bancária do prontuário', () => {
    const html = renderWithRouter(createElement(RepasseOverviewPage));
    expect(html).toContain('Programado custeio');
    expect(html).toContain('Programado capital');
    expect(html).toContain('Pagamento informado');
    expect(html).toContain('Ordem FNDE');
    expect(html).toContain('Crédito localizado');
    expect(html).toContain('EM Escola Teste');
  });

  test('PDDE Básico mostra primeira e segunda parcela junto da localização do saldo', () => {
    const html = renderWithRouter(createElement(PddeBasicOverviewPage));
    expect(html).toContain('1ª e 2ª parcelas + localização do saldo');
    expect(html).toContain('1ª parcela com pagamento informado');
    expect(html).toContain('2ª parcela com pagamento informado');
    expect(html).toContain('Em conta corrente');
    expect(html).toContain('Em aplicação');
  });

  test('contas e saldos mostra identidade bancária, abertura, ocorrência e aplicações', () => {
    const html = renderWithRouter(createElement(BalancesOverviewPage));
    expect(html).toContain('Situação de abertura');
    expect(html).toContain('Conta ativa');
    expect(html).toContain('Fundos');
    expect(html).toContain('RDB/CDB');
    expect(html).toContain('EM Escola Teste');
  });

  test('carteira compacta preserva a linguagem probatória visível', () => {
    const html = renderWithRouter(createElement(PortfolioSchoolList, { schools: [summary] }));
    expect(html).toContain('Pagamento informado');
    expect(html).toContain('Crédito localizado');
    expect(html).not.toContain('>Pagamento<');
    expect(html).not.toContain('>Crédito<');
  });
});
