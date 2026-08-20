import type { HumanSchool } from '../types';

export type SchoolAttentionTarget = '#repasses' | '#contas-saldos' | '#prestacao-contas';

export interface SchoolAttentionItem {
  key: string;
  title: string;
  description: string;
  target: SchoolAttentionTarget | null;
}

export interface SchoolOperationalReading {
  tone: 'attention' | 'clear';
  statusLabel: string;
  attentionItems: SchoolAttentionItem[];
}

const SOURCE_UNAVAILABLE = 'Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.';
const MISSING_POSITION = 'Há conta sem posição pública de saldo disponível na data desta consulta.';
const MISSING_CREDIT = 'Há pagamento informado no PDDEInfo sem crédito compatível localizado nesta coleta.';

export function deriveSchoolOperationalReading(school: HumanSchool): SchoolOperationalReading {
  const attentionItems: SchoolAttentionItem[] = [];
  const installments = school.programs.flatMap((program) => program.installments);

  if (school.accounting.some((item) => item.paymentSuspended)) {
    attentionItems.push({
      key: 'payment-suspended',
      title: 'Pagamento suspenso informado',
      description: 'A prestação de contas informa suspensão de pagamento para pelo menos um programa.',
      target: '#prestacao-contas',
    });
  }

  if (installments.some((item) => item.paymentInformedCents > 0 && item.account === null)) {
    attentionItems.push({
      key: 'repasse-account-missing',
      title: 'Pagamento informado sem conta exibida',
      description: 'Há pagamento informado no PDDEInfo sem conta do repasse apresentada neste retrato.',
      target: '#repasses',
    });
  }

  if (installments.some((item) => (
    item.paymentInformedCents > 0 && item.creditEvidence.status === 'Crédito não localizado'
  ))) {
    attentionItems.push({
      key: 'credit-not-located',
      title: 'Pagamento informado sem crédito compatível localizado',
      description: 'Confira as parcelas com pagamento informado que ainda não têm crédito compatível localizado nesta coleta.',
      target: '#repasses',
    });
  }

  if (installments.some((item) => item.creditEvidence.status === 'Requer conferência')) {
    attentionItems.push({
      key: 'credit-requires-review',
      title: 'Crédito compatível requer conferência',
      description: 'Há mais de um crédito compatível possível; confira as evidências da parcela.',
      target: '#repasses',
    });
  }

  if (installments.some((item) => item.creditEvidence.status === 'Consulta inconclusiva')) {
    attentionItems.push({
      key: 'account-query-inconclusive',
      title: 'Consulta da conta inconclusiva',
      description: 'A consulta não foi suficiente para concluir se há crédito compatível para a parcela.',
      target: '#repasses',
    });
  }

  if (school.accounts.some((account) => account.latestPosition === null)) {
    attentionItems.push({
      key: 'balance-position-missing',
      title: 'Conta sem posição pública de saldo',
      description: 'Há conta sem posição pública de saldo disponível na data desta consulta.',
      target: '#contas-saldos',
    });
  }

  if (school.followUp.includes(SOURCE_UNAVAILABLE)) {
    attentionItems.push({
      key: 'source-unavailable',
      title: 'Informação de fonte ainda não disponível',
      description: SOURCE_UNAVAILABLE,
      target: null,
    });
  }

  const representedFollowUps = new Set<string>();
  if (attentionItems.some((item) => item.key === 'source-unavailable')) {
    representedFollowUps.add(SOURCE_UNAVAILABLE);
  }
  if (attentionItems.some((item) => item.key === 'balance-position-missing')) {
    representedFollowUps.add(MISSING_POSITION);
  }
  if (attentionItems.some((item) => item.key === 'credit-not-located')) {
    representedFollowUps.add(MISSING_CREDIT);
  }
  [...new Set(school.followUp)]
    .filter((message) => !representedFollowUps.has(message))
    .forEach((message, index) => {
      attentionItems.push({
        key: `follow-up-${index}`,
        title: 'Outro ponto de acompanhamento',
        description: message,
        target: null,
      });
    });

  return {
    tone: attentionItems.length > 0 ? 'attention' : 'clear',
    statusLabel: attentionItems.length > 0
      ? 'Acompanhamento necessário'
      : 'Sem apontamento no retrato atual',
    attentionItems,
  };
}
