import { describe, expect, test } from 'vitest';
import type { LiveSchoolQueryResult } from '../../src/product/api';
import type { HumanPortfolio, HumanSchool } from '../../src/product/types';
import { runLivePortfolioQuery } from '../../src/product/live-portfolio';

function school(inep: string): HumanSchool {
  return {
    fiscalYear: 2026,
    school: {
      inep,
      sme: `0431${inep.slice(-3)}`,
      name: `Escola ${inep}`,
      uex: '',
      cnpj: '',
    },
    programs: [],
    accounts: [],
    accounting: [],
    followUp: [],
  };
}

function portfolio(item: HumanSchool): HumanPortfolio {
  return {
    title: 'Inteligência Financeira PDDE | 4ª CRE',
    fiscalYear: 2026,
    referenceLabel: 'Posição de saldo público ainda não disponível para 2026',
    schoolCount: 1,
    metrics: {
      schoolCount: 1,
      accountsTotal: 0,
      accountsWithPosition: 0,
      programmedCents: 0,
      paymentInformedCents: 0,
      creditLocatedCents: 0,
      reportedBalanceCents: null,
      applicationsCents: null,
    },
    sources: [{ name: 'PDDEInfo', information: 'Repasses, contas e saldos.' }],
    indicators: [],
    schools: [{
      sme: item.school.sme,
      name: item.school.name,
      inep: item.school.inep,
      programmedCents: 0,
      paymentInformedCents: 0,
      creditLocatedCents: 0,
      knownBalanceCents: null,
      referenceDate: null,
      accountsTotal: 0,
      accountsWithReferencePosition: 0,
      followUpCount: 0,
      paymentSuspended: false,
      repasseAccountMissing: false,
    }],
  };
}

function result(inep: string, status: 'COMPLETE' | 'PARTIAL'): LiveSchoolQueryResult {
  const item = school(inep);
  return {
    generatedAt: '2026-08-19T20:00:00.000Z',
    status,
    portfolio: portfolio(item),
    school: item,
  };
}

describe('proteção do retrato durante nova consulta', () => {
  test('rejeita a atualização quando qualquer unidade termina com cobertura parcial', async () => {
    await expect(runLivePortfolioQuery(['33000001', '33000002'], {
      attempts: 1,
      querySchool: async (inep) => result(
        inep,
        inep === '33000002' ? 'PARTIAL' : 'COMPLETE',
      ),
    })).rejects.toThrow(/cobertura parcial/i);
  });
});
