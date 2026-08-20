import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SchoolOperationalSummary } from '../../src/product/components/SchoolOperationalSummary';
import { humanSchoolSchema } from '../../src/product/types';

const school = humanSchoolSchema.parse({
  fiscalYear: 2026,
  school: {
    inep: '33069247',
    sme: '0410001',
    name: 'EM EMA NEGRAO DE LIMA',
    uex: 'CEC EMA NEGRAO DE LIMA',
    cnpj: '01872287000102',
  },
  programs: [{
    name: 'PDDE / PDDE Básico',
    installments: [{
      installment: '1ª Parcela',
      programmedCents: 100_000,
      paymentInformedCents: 100_000,
      paymentInformedDate: '2026-08-04',
      paymentOrderDate: null,
      account: { bank: '001', agency: '0249', number: '0000549797' },
      creditEvidence: {
        status: 'Crédito não localizado',
        date: null,
        amountCents: null,
        document: null,
      },
      note: null,
    }],
  }],
  accounts: [{
    program: 'PDDE',
    bank: '001',
    agency: '0249',
    account: '0000549797',
    positions: [{
      referenceDate: '2026-07-31',
      checkingBalanceCents: 10_000,
      applications: {
        fundsCents: 40_000,
        savingsCents: 0,
        rdbCdbCents: 0,
        totalCents: 40_000,
      },
      totalReportedBalanceCents: 50_000,
    }],
    latestPosition: {
      referenceDate: '2026-07-31',
      checkingBalanceCents: 10_000,
      applications: {
        fundsCents: 40_000,
        savingsCents: 0,
        rdbCdbCents: 0,
        totalCents: 40_000,
      },
      totalReportedBalanceCents: 50_000,
    },
    movements: [],
    note: null,
  }],
  accounting: [],
  followUp: ['Há pagamento informado no PDDEInfo sem crédito compatível localizado nesta coleta.'],
});

describe('síntese operacional do prontuário', () => {
  it('apresenta cadeia probatória, saldo datado e ação útil antes dos detalhes', () => {
    const html = renderToStaticMarkup(createElement(SchoolOperationalSummary, { school }));

    expect(html).toContain('id="resumo"');
    expect(html).toContain('Leitura rápida desta escola');
    expect(html).toContain('Acompanhamento necessário');
    expect(html).toContain('Previsto');
    expect(html).toContain('Pagamento informado');
    expect(html).toContain('Registro do PDDEInfo');
    expect(html).toContain('Crédito compatível localizado');
    expect(html).toContain('Movimento compatível no SIGEF');
    expect(html).toContain('Saldo informado');
    expect(html).toContain('Posição de 31/07/2026');
    expect(html).toContain('href="#repasses"');
    expect(html.match(/Pagamento informado sem crédito compatível localizado/g)).toHaveLength(1);
  });

  it('apresenta ausência de saldo como ausência, sem data artificial', () => {
    const schoolWithoutPosition = humanSchoolSchema.parse({
      ...school,
      accounts: [{
        ...school.accounts[0],
        positions: [],
        latestPosition: null,
      }],
    });

    const html = renderToStaticMarkup(createElement(SchoolOperationalSummary, {
      school: schoolWithoutPosition,
    }));

    expect(html).toContain('Saldo informado');
    expect(html).toContain('Não disponível');
    expect(html).toContain('Ainda não há posição pública de saldo disponível');
    expect(html).not.toContain('Posição de Não disponível');
  });

  it('mantém ressalva de acompanhamento quando não há apontamento', () => {
    const schoolWithoutAttention = humanSchoolSchema.parse({
      ...school,
      programs: [{
        ...school.programs[0],
        installments: [{
          ...school.programs[0].installments[0],
          creditEvidence: {
            status: 'Crédito localizado',
            date: '2026-08-05',
            amountCents: 100_000,
            document: 'OB123',
          },
        }],
      }],
      followUp: [],
    });

    const html = renderToStaticMarkup(createElement(SchoolOperationalSummary, {
      school: schoolWithoutAttention,
    }));

    expect(html).toContain('Sem apontamento no retrato atual');
    expect(html).toContain('Nenhum ponto de acompanhamento no retrato atual');
    expect(html).toContain('A ausência de apontamentos não substitui o acompanhamento periódico das fontes oficiais.');
    expect(html).not.toContain('Acompanhamento necessário');
  });
});
