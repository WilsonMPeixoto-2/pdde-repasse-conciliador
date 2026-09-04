import { describe, expect, test } from 'vitest';
import { resolutionPlanForGap } from '../../shared/source-resolution-policy';

describe('política de escalonamento de fontes', () => {
  test('pagamento sem crédito usa fontes bancárias e explicita dependências', () => {
    const plan = resolutionPlanForGap('PAYMENT_NO_CREDIT');
    expect(plan.steps.map((step) => step.source)).toEqual([
      'SIGEF_EXTRATO',
      'SIGEF_LIBERACOES',
      'BB_GESTAO_AGIL',
      'PORTAL_TRANSPARENCIA',
      'PDDE_MONITORING_PANELS',
    ]);
    expect(plan.steps[0].state).toBe('ACTIVE');
    expect(plan.steps[2].state).toBe('CREDENTIAL_REQUIRED');
  });

  test('prestação divergente inclui SiGPC público como segunda evidência', () => {
    const plan = resolutionPlanForGap('ACCOUNTING_CONFLICT');
    expect(plan.steps.some((step) => step.source === 'SIGPC_PUBLICO')).toBe(true);
  });

  test('saldo anterior ao pagamento não é contradição e prioriza posição bancária corrente', () => {
    const plan = resolutionPlanForGap('BALANCE_REFERENCE_BEFORE_PAYMENT');
    expect(plan.contradiction).toBe(false);
    expect(plan.primaryAction).toContain('posição bancária posterior');
    expect(plan.steps[0]).toMatchObject({
      source: 'BB_GESTAO_AGIL',
      state: 'CREDENTIAL_REQUIRED',
    });
  });

  test('ausência de saldo publicado também escala primeiro para a fonte bancária oficial', () => {
    const plan = resolutionPlanForGap('NO_BALANCE_POSITION');
    expect(plan.steps[0].source).toBe('BB_GESTAO_AGIL');
    expect(plan.primaryAction).toContain('posição bancária corrente');
  });
});
