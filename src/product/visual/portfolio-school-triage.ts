import type { HumanPortfolioSchool } from '../types';

export type PortfolioSchoolStatus =
  | 'suspended'
  | 'attention'
  | 'partial'
  | 'no_accounts'
  | 'ready';

export interface PortfolioSchoolTriage {
  status: PortfolioSchoolStatus;
  label: string;
  needsAttention: boolean;
  coverageRatio: number | null;
  coverageLabel: string;
  reasons: string[];
  priority: number;
}

function countLabel(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function derivePortfolioSchoolTriage(
  school: HumanPortfolioSchool,
): PortfolioSchoolTriage {
  const coverageRatio = school.accountsTotal > 0
    ? school.accountsWithReferencePosition / school.accountsTotal
    : null;
  const reasons: string[] = [];

  if (school.paymentSuspended) {
    reasons.push('Há prestação com pagamento suspenso informado.');
  }
  if (school.repasseAccountMissing) {
    reasons.push('Há repasse sem conta exibida.');
  }
  if (school.followUpCount > 0) {
    reasons.push(`${countLabel(school.followUpCount, 'apontamento', 'apontamentos')} de acompanhamento.`);
  }
  if (
    school.accountsTotal > 0
    && school.accountsWithReferencePosition < school.accountsTotal
  ) {
    reasons.push(
      `Cobertura de saldo: ${school.accountsWithReferencePosition} de ${school.accountsTotal} contas na referência.`,
    );
  }
  if (school.accountsTotal === 0) {
    reasons.push('Nenhuma conta foi apresentada para a unidade no retrato atual.');
  }

  const coverageLabel = school.accountsTotal === 0
    ? 'Sem conta apresentada'
    : `${school.accountsWithReferencePosition}/${school.accountsTotal} ${school.accountsTotal === 1 ? 'conta' : 'contas'} na referência`;

  if (school.paymentSuspended) {
    return {
      status: 'suspended',
      label: 'Pagamento suspenso',
      needsAttention: true,
      coverageRatio,
      coverageLabel,
      reasons,
      priority: 5,
    };
  }
  if (school.repasseAccountMissing || school.followUpCount > 0) {
    return {
      status: 'attention',
      label: 'Acompanhamento',
      needsAttention: true,
      coverageRatio,
      coverageLabel,
      reasons,
      priority: 4,
    };
  }
  if (school.accountsTotal === 0) {
    return {
      status: 'no_accounts',
      label: 'Sem conta apresentada',
      needsAttention: true,
      coverageRatio,
      coverageLabel,
      reasons,
      priority: 3,
    };
  }
  if (school.accountsWithReferencePosition < school.accountsTotal) {
    return {
      status: 'partial',
      label: 'Cobertura parcial',
      needsAttention: true,
      coverageRatio,
      coverageLabel,
      reasons,
      priority: 2,
    };
  }
  return {
    status: 'ready',
    label: 'Leitura disponível',
    needsAttention: false,
    coverageRatio,
    coverageLabel,
    reasons,
    priority: 1,
  };
}
