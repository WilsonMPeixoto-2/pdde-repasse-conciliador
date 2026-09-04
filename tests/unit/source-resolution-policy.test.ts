import { describe, expect, test } from 'vitest';
import { resolutionPlanForGap } from '../../shared/source-resolution-policy';

describe('política de escalonamento de fontes', () => {
  test('pagamento sem crédito usa primeiro fontes ativas e explicita dependências', () => {
    const plan = resolutionPlanForGap('PAYMENT_NO_CREDIT');
    expect(plan.steps.map((step) => step.source)).toEqual([
      'SIGEF_EXTRATO',
      'SIGEF_LIBERACOES',
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

  test('saldo anterior ao pagamento não é classificado como contradição', () => {
    const plan = resolutionPlanForGap('BALANCE_REFERENCE_BEFORE_PAYMENT');
    expect(plan.contradiction).toBe(false);
    expect(plan.primaryAction).toContain('posição de saldo posterior');
  });
});
