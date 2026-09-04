import { describe, expect, test } from 'vitest';
import { resolutionPlanForGap } from '../../shared/source-resolution-policy';

describe('política de escalonamento de fontes', () => {
  test('pagamento sem crédito usa primeiro fontes públicas e explicita dependências', () => {
    const plan = resolutionPlanForGap('PAYMENT_NO_CREDIT');
    expect(plan.steps.map((step) => step.source)).toEqual([
      'SIGEF_EXTRATO',
      'SIGEF_LIBERACOES',
      'SIGEF_EXTRATOS_PUBLICOS',
      'FNDE_DADOS_ABERTOS',
      'PORTAL_TRANSPARENCIA',
      'PDDE_MONITORING_PANELS',
      'BB_GESTAO_AGIL',
    ]);
    expect(plan.steps[0].state).toBe('ACTIVE');
    expect(plan.steps[2].state).toBe('PILOT_REQUIRED');
    expect(plan.steps.at(-1)?.state).toBe('CREDENTIAL_REQUIRED');
  });

  test('prestação divergente inclui SiGPC público como segunda evidência', () => {
    const plan = resolutionPlanForGap('ACCOUNTING_CONFLICT');
    expect(plan.steps.some((step) => step.source === 'SIGPC_PUBLICO')).toBe(true);
  });

  test('saldo anterior ao pagamento não é contradição e tenta novas fontes públicas antes de credenciais bancárias', () => {
    const plan = resolutionPlanForGap('BALANCE_REFERENCE_BEFORE_PAYMENT');
    expect(plan.contradiction).toBe(false);
    expect(plan.primaryAction).toContain('posição posterior');
    expect(plan.steps.slice(0, 2)).toEqual([
      expect.objectContaining({ source: 'SIGEF_EXTRATOS_PUBLICOS', state: 'PILOT_REQUIRED' }),
      expect.objectContaining({ source: 'FNDE_DADOS_ABERTOS', state: 'PILOT_REQUIRED' }),
    ]);
    expect(plan.steps.findIndex((step) => step.source === 'BB_GESTAO_AGIL'))
      .toBeGreaterThan(plan.steps.findIndex((step) => step.source === 'SIGEF_LIBERACOES'));
  });

  test('ausência de saldo publicado também prioriza rotas públicas alternativas', () => {
    const plan = resolutionPlanForGap('NO_BALANCE_POSITION');
    expect(plan.steps.slice(0, 2).map((step) => step.source)).toEqual([
      'SIGEF_EXTRATOS_PUBLICOS',
      'FNDE_DADOS_ABERTOS',
    ]);
    expect(plan.primaryAction).toContain('posição de saldo');
  });
});
