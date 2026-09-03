import { describe, expect, test } from 'vitest';
import type { LiveSchoolQueryResult } from '../../src/product/api';
import type { HumanPortfolio, HumanSchool } from '../../src/product/types';
import {
  buildLivePortfolio,
  runLivePortfolioQuery,
} from '../../src/product/live-portfolio';

function position(referenceDate: string, balance: number, applications: number) {
  return {
    referenceDate,
    checkingBalanceCents: balance - applications,
    applications: {
      fundsCents: applications,
      savingsCents: 0,
      rdbCdbCents: 0,
      totalCents: applications,
    },
    totalReportedBalanceCents: balance,
  };
}

function school(input: {
  inep: string;
  sme: string;
  name: string;
  referenceDate: string;
  programmed: number;
  paid: number;
  credit: number;
  balance: number;
}): HumanSchool {
  const latestPosition = position(input.referenceDate, input.balance, 25);
  return {
    fiscalYear: 2026,
    school: {
      inep: input.inep,
      sme: input.sme,
      name: input.name,
      uex: `UEx ${input.name}`,
      cnpj: '00.000.000/0001-00',
    },
    programs: [{
      name: 'PDDE Básico',
      installments: [{
        installment: '1ª parcela',
        programmedCents: input.programmed,
        paymentInformedCents: input.paid,
        paymentInformedDate: '2026-03-10',
        paymentOrderDate: '2026-03-10',
        account: { bank: '001', agency: '1234', number: input.inep },
        creditEvidence: {
          status: input.credit > 0 ? 'Crédito localizado' : 'Crédito não localizado',
          date: input.credit > 0 ? '2026-03-11' : null,
          amountCents: input.credit > 0 ? input.credit : null,
          document: null,
        },
        note: null,
      }],
    }],
    accounts: [{
      program: 'PDDE Básico',
      bank: '001',
      agency: '1234',
      account: input.inep,
      positions: [latestPosition],
      latestPosition,
      movements: [],
      note: null,
    }],
    registration: null,
    accountOpenings: [],
    suspensions: [],
    sourceCoverage: [],
    accounting: [],
    followUp: [],
  };
}

function singlePortfolio(item: HumanSchool): HumanPortfolio {
  const installment = item.programs[0].installments[0];
  const latestPosition = item.accounts[0].latestPosition;
  const hasMissingCredit = installment.paymentInformedCents > 0
    && installment.creditEvidence.status === 'Crédito não localizado';
  return {
    title: 'Inteligência Financeira PDDE | 4ª CRE',
    fiscalYear: 2026,
    referenceLabel: `Posição financeira pública disponível até ${latestPosition!.referenceDate}`,
    schoolCount: 1,
    metrics: {
      schoolCount: 1,
      accountsTotal: 1,
      accountsWithPosition: 1,
      programmedCents: installment.programmedCents,
      paymentInformedCents: installment.paymentInformedCents,
      creditLocatedCents: installment.creditEvidence.amountCents ?? 0,
      reportedBalanceCents: latestPosition!.totalReportedBalanceCents,
      applicationsCents: latestPosition!.applications.totalCents,
    },
    sources: [
      { name: 'PDDEInfo', information: 'Repasses, contas e saldos.' },
      { name: 'SIGEF', information: 'Movimentações e créditos.' },
    ],
    indicators: [{
      label: 'Pagamento informado sem crédito compatível localizado',
      count: hasMissingCredit ? 1 : 0,
      units: hasMissingCredit
        ? [{ sme: item.school.sme, name: item.school.name, inep: item.school.inep }]
        : [],
    }],
    schools: [{
      sme: item.school.sme,
      name: item.school.name,
      inep: item.school.inep,
      programmedCents: installment.programmedCents,
      paymentInformedCents: installment.paymentInformedCents,
      creditLocatedCents: installment.creditEvidence.amountCents ?? 0,
      knownBalanceCents: latestPosition!.totalReportedBalanceCents,
      referenceDate: latestPosition!.referenceDate,
      accountsTotal: 1,
      accountsWithReferencePosition: 1,
      followUpCount: 0,
      paymentSuspended: false,
      repasseAccountMissing: false,
    }],
  };
}

function result(item: HumanSchool, status: 'COMPLETE' | 'PARTIAL' = 'COMPLETE'): LiveSchoolQueryResult {
  return {
    generatedAt: `2026-08-19T${item.school.inep.slice(-2)}:00:00.000Z`,
    status,
    portfolio: singlePortfolio(item),
    school: item,
  };
}

describe('agregação da nova consulta por unidade', () => {
  const first = school({
    inep: '33000001', sme: '0431001', name: 'Escola A', referenceDate: '2026-07-31',
    programmed: 100, paid: 80, credit: 80, balance: 500,
  });
  const second = school({
    inep: '33000002', sme: '0431002', name: 'Escola B', referenceDate: '2026-08-15',
    programmed: 200, paid: 150, credit: 0, balance: 700,
  });

  test('recompõe a carteira com uma referência financeira global e indicadores nominais', () => {
    const live = buildLivePortfolio([result(first), result(second, 'PARTIAL')]);

    expect(live.status).toBe('PARTIAL');
    expect(live.portfolio.schoolCount).toBe(2);
    expect(live.portfolio.referenceLabel).toBe('Posição financeira pública disponível até 15/08/2026');
    expect(live.portfolio.metrics.programmedCents).toBe(300);
    expect(live.portfolio.metrics.paymentInformedCents).toBe(230);
    expect(live.portfolio.metrics.creditLocatedCents).toBe(80);
    expect(live.portfolio.metrics.accountsTotal).toBe(2);
    expect(live.portfolio.metrics.accountsWithPosition).toBe(1);
    expect(live.portfolio.metrics.reportedBalanceCents).toBe(700);
    expect(live.portfolio.schools[0]).toMatchObject({
      inep: '33000001',
      referenceDate: '2026-08-15',
      accountsWithReferencePosition: 0,
      knownBalanceCents: null,
    });
    expect(live.portfolio.indicators[0]).toMatchObject({ count: 1 });
    expect(live.portfolio.indicators[0].units.map((unit) => unit.inep)).toEqual(['33000002']);
    expect(Object.keys(live.schools)).toEqual(['33000001', '33000002']);
  });

  test('consulta as unidades com concorrência limitada e não publica carteira incompleta', async () => {
    const inputs = [first, second, { ...first, school: { ...first.school, inep: '33000003', sme: '0431003', name: 'Escola C' } }];
    const byInep = new Map(inputs.map((item) => [item.school.inep, item]));
    let active = 0;
    let peak = 0;
    const progress: number[] = [];

    const live = await runLivePortfolioQuery(inputs.map((item) => item.school.inep), {
      concurrency: 2,
      querySchool: async (inep) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return result(byInep.get(inep)!);
      },
      onProgress: ({ completed }) => progress.push(completed),
    });

    expect(peak).toBeLessThanOrEqual(2);
    expect(progress.at(-1)).toBe(3);
    expect(live.portfolio.schoolCount).toBe(3);

    await expect(runLivePortfolioQuery(['33000001', '33000002'], {
      concurrency: 2,
      querySchool: async (inep) => {
        if (inep === '33000002') throw new Error('fonte indisponível');
        return result(first);
      },
    })).rejects.toThrow(/1 de 2 unidades/i);
  });
});
