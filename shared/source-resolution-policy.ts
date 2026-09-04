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
  | 'SIGEF_EXTRATOS_PUBLICOS'
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
    purpose: 'Procurar crédito, aplicação, resgate e demais movimentações da conta vinculada; se a cobertura devolvida for anterior a uma liberação conhecida, tratar o extrato como defasado e continuar a investigação.',
  },
  {
    source: 'SIGEF_LIBERACOES',
    state: 'ACTIVE',
    purpose: 'Recuperar OB, data e conta de destino quando o repasse informado não estiver suficientemente vinculado.',
  },
];

const PUBLIC_BULK_EXTRACT: ResolutionStep = {
  source: 'SIGEF_EXTRATOS_PUBLICOS',
  state: 'PILOT_REQUIRED',
  purpose: 'Consultar a área pública SIGEF “Extratos > Consultas Gerais” por exercício, programa e período. O índice público oferece o programa 02/PDDE em 2026; a coleta do arquivo só pode ser automatizada se houver rota reproduzível sem contornar CAPTCHA ou outro controle de acesso.',
};

const OPEN_BALANCE_DATA: ResolutionStep = {
  source: 'FNDE_DADOS_ABERTOS',
  state: 'PILOT_REQUIRED',
  purpose: 'Buscar o conjunto mensal “Saldos das Contas das UEx - PDDE Básico - Públicas” e a execução financeira pública, exigindo referência 2026 e granularidade por UEx/escola antes de incorporá-los como evidência.',
};

const CURRENT_BANK_POSITION: ResolutionStep = {
  source: 'BB_GESTAO_AGIL',
  state: 'CREDENTIAL_REQUIRED',
  purpose: 'Fallback institucional: obter extrato corrente e saldo das aplicações na solução oficial do Banco do Brasil somente quando houver credencial institucional autorizada.',
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
      primaryAction: 'Buscar evidência bancária independente do pagamento informado, escalando por fontes públicas antes de depender de credencial institucional.',
      steps: [
        ...ACTIVE_SIGEF,
        PUBLIC_BULK_EXTRACT,
        OPEN_BALANCE_DATA,
        ...INDEPENDENT_PAYMENT_CHECKS,
        CURRENT_BANK_POSITION,
      ],
    };
  }

  if (gap === 'BALANCE_REFERENCE_BEFORE_PAYMENT') {
    return {
      gap,
      contradiction: false,
      primaryAction: 'Obter posição posterior ao pagamento em outra fonte pública e preservar o saldo mensal antigo apenas como histórico; recorrer à fonte bancária autenticada somente se as rotas públicas não resolverem a lacuna.',
      steps: [
        PUBLIC_BULK_EXTRACT,
        OPEN_BALANCE_DATA,
        ACTIVE_SIGEF[0],
        ACTIVE_SIGEF[1],
        CURRENT_BANK_POSITION,
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
      primaryAction: 'Reconstruir a linha do tempo da conta em múltiplas fontes para explicar crédito, aplicação, gasto, resgate, estorno ou ausência de evidência.',
      steps: [
        PUBLIC_BULK_EXTRACT,
        OPEN_BALANCE_DATA,
        ...ACTIVE_SIGEF,
        ...INDEPENDENT_PAYMENT_CHECKS,
        CURRENT_BANK_POSITION,
      ],
    };
  }

  if (gap === 'NO_BALANCE_POSITION') {
    return {
      gap,
      contradiction: false,
      primaryAction: 'Tentar localizar posição de saldo em fontes públicas alternativas e movimentações, sem converter ausência de publicação em saldo zero.',
      steps: [
        PUBLIC_BULK_EXTRACT,
        OPEN_BALANCE_DATA,
        ...ACTIVE_SIGEF,
        CURRENT_BANK_POSITION,
        {
          source: 'PDDEINFO',
          state: 'ACTIVE',
          purpose: 'Reconsultar saldos publicados e cobertura mensal.',
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
        PUBLIC_BULK_EXTRACT,
        {
          source: 'PDDEINFO',
          state: 'ACTIVE',
          purpose: 'Cruzar consulta por escola e relatório público de abertura/vínculo de conta quando disponível.',
        },
        CURRENT_BANK_POSITION,
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
