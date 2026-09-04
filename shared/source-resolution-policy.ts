export type FinancialGapKind =
  | 'PAYMENT_NO_CREDIT'
  | 'BALANCE_REFERENCE_BEFORE_PAYMENT'
  | 'ZERO_BALANCE_AFTER_PAYMENT'
  | 'NO_BALANCE_POSITION'
  | 'MISSING_ACCOUNT'
  | 'ACCOUNTING_CONFLICT';

export type ResolutionSource =
  | 'PDDEINFO'
  | 'SIGEF_EXTRATO'
  | 'SIGEF_LIBERACOES'
  | 'BB_GESTAO_AGIL'
  | 'PORTAL_TRANSPARENCIA'
  | 'SIGPC_PUBLICO'
  | 'FNDE_DADOS_ABERTOS'
  | 'PDDE_MONITORING_PANELS';

export type ResolutionSourceState = 'ACTIVE' | 'CREDENTIAL_REQUIRED' | 'PILOT_REQUIRED';

export interface ResolutionStep {
  source: ResolutionSource;
  state: ResolutionSourceState;
  purpose: string;
}

export interface SourceResolutionPlan {
  gap: FinancialGapKind;
  contradiction: boolean;
  primaryAction: string;
  steps: ResolutionStep[];
}

const ACTIVE_SIGEF: ResolutionStep[] = [
  {
    source: 'SIGEF_EXTRATO',
    state: 'ACTIVE',
    purpose: 'Procurar crédito, aplicação, resgate e demais movimentações da conta vinculada.',
  },
  {
    source: 'SIGEF_LIBERACOES',
    state: 'ACTIVE',
    purpose: 'Recuperar OB, data e conta de destino quando o repasse informado não estiver suficientemente vinculado.',
  },
];

const CURRENT_BANK_POSITION: ResolutionStep = {
  source: 'BB_GESTAO_AGIL',
  state: 'CREDENTIAL_REQUIRED',
  purpose: 'Obter extrato bancário corrente e saldo das aplicações diretamente da solução oficial do Banco do Brasil usada pelo FNDE, quando houver credencial institucional autorizada.',
};

const INDEPENDENT_PAYMENT_CHECKS: ResolutionStep[] = [
  {
    source: 'PORTAL_TRANSPARENCIA',
    state: 'CREDENTIAL_REQUIRED',
    purpose: 'Cruzar documentos SIAFI e recursos federais recebidos pelo CNPJ da UEx.',
  },
  {
    source: 'PDDE_MONITORING_PANELS',
    state: 'PILOT_REQUIRED',
    purpose: 'Usar os painéis oficiais como controle secundário de repasses previstos/realizados e execução, quando houver extração auditável.',
  },
];

export function resolutionPlanForGap(gap: FinancialGapKind): SourceResolutionPlan {
  if (gap === 'PAYMENT_NO_CREDIT') {
    return {
      gap,
      contradiction: false,
      primaryAction: 'Buscar evidência bancária independente do pagamento informado.',
      steps: [...ACTIVE_SIGEF, CURRENT_BANK_POSITION, ...INDEPENDENT_PAYMENT_CHECKS],
    };
  }

  if (gap === 'BALANCE_REFERENCE_BEFORE_PAYMENT') {
    return {
      gap,
      contradiction: false,
      primaryAction: 'Obter posição bancária posterior ao pagamento em fonte corrente; não usar saldo mensal antigo como localização atual.',
      steps: [
        CURRENT_BANK_POSITION,
        ACTIVE_SIGEF[0],
        ACTIVE_SIGEF[1],
        {
          source: 'PDDEINFO',
          state: 'ACTIVE',
          purpose: 'Preservar e reconsultar a série mensal oficial de saldos, sem tratá-la como corrente quando a referência for anterior ao pagamento.',
        },
        ...INDEPENDENT_PAYMENT_CHECKS,
      ],
    };
  }

  if (gap === 'ZERO_BALANCE_AFTER_PAYMENT') {
    return {
      gap,
      contradiction: true,
      primaryAction: 'Reconstruir a linha do tempo da conta para explicar crédito, aplicação, gasto, resgate, estorno ou ausência de evidência.',
      steps: [
        CURRENT_BANK_POSITION,
        ...ACTIVE_SIGEF,
        ...INDEPENDENT_PAYMENT_CHECKS,
        {
          source: 'FNDE_DADOS_ABERTOS',
          state: 'PILOT_REQUIRED',
          purpose: 'Usar dados abertos como backfill/controle apenas quando o recurso comprovar cobertura temporal adequada.',
        },
      ],
    };
  }

  if (gap === 'NO_BALANCE_POSITION') {
    return {
      gap,
      contradiction: false,
      primaryAction: 'Tentar localizar posição bancária corrente e movimentações sem converter ausência de publicação em saldo zero.',
      steps: [
        CURRENT_BANK_POSITION,
        {
          source: 'PDDEINFO',
          state: 'ACTIVE',
          purpose: 'Reconsultar saldos publicados e cobertura mensal.',
        },
        ...ACTIVE_SIGEF,
        {
          source: 'FNDE_DADOS_ABERTOS',
          state: 'PILOT_REQUIRED',
          purpose: 'Usar saldos/dados históricos apenas se o recurso tiver referência compatível com 2026.',
        },
      ],
    };
  }

  if (gap === 'MISSING_ACCOUNT') {
    return {
      gap,
      contradiction: false,
      primaryAction: 'Recuperar a conta destinatária do repasse sem inferir conta histórica.',
      steps: [
        ACTIVE_SIGEF[1],
        CURRENT_BANK_POSITION,
        {
          source: 'PDDEINFO',
          state: 'ACTIVE',
          purpose: 'Cruzar consulta por escola e relatório público de abertura/vínculo de conta quando disponível.',
        },
      ],
    };
  }

  return {
    gap,
    contradiction: true,
    primaryAction: 'Cruzar a situação de prestação em fonte independente antes de concluir regularidade ou pendência.',
    steps: [
      {
        source: 'PDDEINFO',
        state: 'ACTIVE',
        purpose: 'Preservar a situação publicada no PDDEInfo como uma observação de origem.',
      },
      {
        source: 'SIGPC_PUBLICO',
        state: 'PILOT_REQUIRED',
        purpose: 'Consultar a situação da UEx no SiGPC Acesso Público como segunda evidência independente.',
      },
    ],
  };
}
