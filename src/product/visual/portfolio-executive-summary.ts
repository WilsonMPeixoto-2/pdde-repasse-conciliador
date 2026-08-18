import type { HumanPortfolio, HumanPortfolioSchool } from '../types';
import {
  derivePortfolioSchoolTriage,
  type PortfolioSchoolStatus,
  type PortfolioSchoolTriage,
} from './portfolio-school-triage';

export interface PortfolioEvidenceStage {
  key: 'programmed' | 'payment' | 'credit';
  label: string;
  valueCents: number;
}

export type PortfolioStatusCounts = Record<PortfolioSchoolStatus, number>;

export interface PortfolioPrioritySchool {
  school: HumanPortfolioSchool;
  triage: PortfolioSchoolTriage;
}

export interface PortfolioExecutiveSummary {
  evidenceStages: PortfolioEvidenceStage[];
  statusCounts: PortfolioStatusCounts;
  attentionCount: number;
  coverageIncompleteCount: number;
  prioritySchools: PortfolioPrioritySchool[];
}

export function derivePortfolioExecutiveSummary(
  portfolio: HumanPortfolio,
): PortfolioExecutiveSummary {
  const statusCounts: PortfolioStatusCounts = {
    suspended: 0,
    attention: 0,
    partial: 0,
    no_accounts: 0,
    ready: 0,
  };
  const prioritySchools: PortfolioPrioritySchool[] = [];
  let attentionCount = 0;
  let coverageIncompleteCount = 0;

  for (const school of portfolio.schools) {
    const triage = derivePortfolioSchoolTriage(school);
    statusCounts[triage.status] += 1;

    if (triage.needsAttention) {
      attentionCount += 1;
      prioritySchools.push({ school, triage });
    }
    if (
      school.accountsTotal === 0
      || school.accountsWithReferencePosition < school.accountsTotal
    ) {
      coverageIncompleteCount += 1;
    }
  }

  prioritySchools.sort((left, right) => (
    right.triage.priority - left.triage.priority
    || left.school.sme.localeCompare(right.school.sme)
    || left.school.name.localeCompare(right.school.name, 'pt-BR')
  ));

  return {
    evidenceStages: [
      {
        key: 'programmed',
        label: 'Previsto em 2026',
        valueCents: portfolio.metrics.programmedCents,
      },
      {
        key: 'payment',
        label: 'Pagamento informado',
        valueCents: portfolio.metrics.paymentInformedCents,
      },
      {
        key: 'credit',
        label: 'Crédito localizado',
        valueCents: portfolio.metrics.creditLocatedCents,
      },
    ],
    statusCounts,
    attentionCount,
    coverageIncompleteCount,
    prioritySchools: prioritySchools.slice(0, 5),
  };
}
