export type SourceAccess = 'PUBLIC' | 'INSTITUTIONAL';
export type SourceIntegrationState = 'ACTIVE' | 'CREDENTIAL_REQUIRED' | 'PILOT_REQUIRED' | 'ACCESS_BLOCKED';

export interface InstitutionalSourceCatalogItem {
  id:
    | 'PDDEINFO'
    | 'SIGEF_EXTRATO'
    | 'SIGEF_LIBERACOES'
    | 'BB_GESTAO_AGIL'
    | 'PORTAL_TRANSPARENCIA'
    | 'SIGPC_PUBLICO'
    | 'FNDE_DADOS_ABERTOS'
    | 'PDDE_MONITORING_PANELS';
  label: string;
  authority: string;
  access: SourceAccess;
  integrationState: SourceIntegrationState;
  purpose: string;
  capabilities: string[];
}

export interface InstitutionalDataProduct {
  id:
    | 'PDDEINFO_REPASSES_2026'
    | 'PDDEINFO_PUBLIC_REPORTS_2026'
    | 'SIGEF_MOVIMENTACOES_2026'
    | 'SIGEF_LIBERACOES_2026'
    | 'BB_GESTAO_AGIL_MOVIMENTACOES_2026'
    | 'PORTAL_TRANSPARENCIA_DOCUMENTOS_2026'
    | 'SIGPC_PUBLICO_PRESTACAO_2026'
    | 'FNDE_DADOS_ABERTOS_CONTROLE_2026'
    | 'PDDE_MONITORING_PANELS_CONTROLE_2026';
  label: string;
  sourceId: InstitutionalSourceCatalogItem['id'];
  fiscalYear: 2026;
  state: SourceIntegrationState;
  purpose: string;
}

/**
 * Catálogo de capacidades do produto. Ele separa fonte descoberta de fonte
 * efetivamente integrada. "PILOT_REQUIRED" nunca pode ser apresentado como
 * cobertura corrente e "ACCESS_BLOCKED" nunca pode ser convertido em dado
 * vazio ou regularidade presumida.
 */
export const SOURCE_CATALOG: InstitutionalSourceCatalogItem[] = [
  {
    id: 'PDDEINFO',
    label: 'PDDEInfo',
    authority: 'FNDE',
    access: 'PUBLIC',
    integrationState: 'ACTIVE',
    purpose: 'Programação e pagamento por custeio/capital, cadastro e mandato da UEx, contas e ocorrências, abertura de conta, suspensões, atendimento, prestação de contas e saldos publicados no PDDEInfo.',
    capabilities: [
      'PROGRAMMED_TRANSFERS',
      'PROGRAMMED_COST_CAPITAL',
      'PAID_INFORMED',
      'PAID_COST_CAPITAL',
      'TRANSFER_ADJUSTMENTS',
      'CURRENT_ACCOUNT',
      'REPORTED_BALANCE',
      'REPORTED_INVESTMENT_BALANCE',
      'SCHOOL_CNPJ',
      'SCHOOL_STUDENT_COUNT',
      'REGISTRATION_STATUS',
      'MANDATE_STATUS',
      'ACCOUNT_OCCURRENCE',
      'ACCOUNT_OPENING_STATUS',
      'SUSPENSION_REASON',
      'PAYMENT_ORDER_DATE',
      'ACCOUNTING_STATUS',
      'PAYMENT_SUSPENSION_STATUS',
      'PUBLIC_ATTENDANCE_REPORT',
      'PUBLIC_REGISTRATION_REPORT',
      'PUBLIC_ACCOUNT_OPENING_REPORT',
      'PUBLIC_SUSPENSION_REPORT',
      'PUBLIC_ACCOUNTING_REPORT',
      'PUBLIC_BALANCE_REPORT',
    ],
  },
  {
    id: 'SIGEF_EXTRATO',
    label: 'SIGEF Web - Extrato de Conta Corrente',
    authority: 'FNDE',
    access: 'PUBLIC',
    integrationState: 'ACTIVE',
    purpose: 'Movimentações bancárias publicadas no SIGEF, com histórico, documento e contraparte quando disponíveis.',
    capabilities: [
      'BANK_TRANSACTIONS',
      'COUNTERPARTY',
      'BANK_DOCUMENT',
      'ACCOUNT_FILTER',
      'PROGRAM_FILTER',
    ],
  },
  {
    id: 'SIGEF_LIBERACOES',
    label: 'SIGEF Web - Liberação de Recursos',
    authority: 'FNDE',
    access: 'PUBLIC',
    integrationState: 'ACTIVE',
    purpose: 'Segunda evidência para ordem bancária, data e conta destinatária. A implementação existe e deve ser acionada prioritariamente quando um pagamento informado não possui evidência bancária suficiente.',
    capabilities: [
      'PAYMENT_ORDER',
      'PAYMENT_ORDER_DATE',
      'DESTINATION_ACCOUNT',
      'TRANSFER_AMOUNT',
      'PROGRAM_FILTER',
      'CNPJ_FILTER',
    ],
  },
  {
    id: 'BB_GESTAO_AGIL',
    label: 'BB Gestão Ágil',
    authority: 'Banco do Brasil / FNDE',
    access: 'INSTITUTIONAL',
    integrationState: 'CREDENTIAL_REQUIRED',
    purpose: 'Fonte institucional histórica para movimentações tempestivas. Em 31/08/2026 o FNDE iniciou a transição gradual para o SIGPC Ágil; as UEx ainda não integram a fase inicial, portanto esta capacidade permanece apenas mapeada e sem credencial configurada.',
    capabilities: [
      'BANK_TRANSACTIONS',
      'CNPJ_FILTER',
      'PROGRAM_FILTER',
      'DATE_RANGE_FILTER',
      'CREDIT_DEBIT_FILTER',
      'BENEFICIARY_FILTER',
      'CATEGORY_FILTER',
      'SUBCATEGORY_FILTER',
      'XLSX_EXPORT',
    ],
  },
  {
    id: 'PORTAL_TRANSPARENCIA',
    label: 'API de Dados do Portal da Transparência',
    authority: 'Controladoria-Geral da União',
    access: 'PUBLIC',
    integrationState: 'CREDENTIAL_REQUIRED',
    purpose: 'Validação independente de documentos de despesa e recursos recebidos por favorecido, usando CNPJ da UEx e dados SIAFI publicados.',
    capabilities: [
      'FAVORED_CNPJ_FILTER',
      'EXPENSE_DOCUMENTS',
      'PAYMENT_DOCUMENTS',
      'RECEIVED_RESOURCES',
      'SIAFI_DOCUMENT_REFERENCE',
      'FISCAL_YEAR_FILTER',
    ],
  },
  {
    id: 'SIGPC_PUBLICO',
    label: 'SiGPC - Acesso Público',
    authority: 'FNDE',
    access: 'PUBLIC',
    integrationState: 'PILOT_REQUIRED',
    purpose: 'Segunda evidência independente para situação de prestação de contas. O acesso público oficial existe, mas a automação deve respeitar proteções/WAF e só será ativada após piloto reproduzível sem contorno de bloqueios.',
    capabilities: ['ACCOUNTING_STATUS', 'UEX_QUERY'],
  },
  {
    id: 'FNDE_DADOS_ABERTOS',
    label: 'Dados Abertos FNDE / Olinda',
    authority: 'FNDE',
    access: 'PUBLIC',
    integrationState: 'PILOT_REQUIRED',
    purpose: 'Backfill e controle secundário para execução, escolas atendidas, saldos e regularidade. A ativação depende de comprovação de frescor e cobertura do recurso específico para 2026.',
    capabilities: ['FINANCIAL_EXECUTION', 'SCHOOL_COVERAGE', 'BALANCE_HISTORY', 'ACCOUNTING_STATUS'],
  },
  {
    id: 'PDDE_MONITORING_PANELS',
    label: 'Painéis oficiais PDDE Total / Básico / Ações Integradas',
    authority: 'FNDE',
    access: 'PUBLIC',
    integrationState: 'PILOT_REQUIRED',
    purpose: 'Controle secundário de cadastro, atendimento, repasses previstos/realizados, execução e prestação. Depende de uma rota de exportação estável e auditável antes de integrar conclusões.',
    capabilities: ['PROGRAMMED_TRANSFERS', 'PAID_INFORMED', 'FINANCIAL_EXECUTION', 'ACCOUNTING_STATUS'],
  },
];

export const DATA_PRODUCT_CATALOG: InstitutionalDataProduct[] = [
  {
    id: 'PDDEINFO_REPASSES_2026',
    label: 'Repasses e situação informada no PDDEInfo - 2026',
    sourceId: 'PDDEINFO',
    fiscalYear: 2026,
    state: 'ACTIVE',
    purpose: 'Base programática do monitoramento: valores programados e pagos com composição custeio/capital, ajustes, ações, parcelas, contas e ocorrências.',
  },
  {
    id: 'PDDEINFO_PUBLIC_REPORTS_2026',
    label: 'Relatórios públicos complementares do PDDEInfo - 2026',
    sourceId: 'PDDEINFO',
    fiscalYear: 2026,
    state: 'ACTIVE',
    purpose: 'Atendimento, quantidade de alunos, cadastro/mandato, abertura de conta, suspensões e seus motivos, situação de prestação de contas e saldos bancários/aplicados com cobertura temporal explícita.',
  },
  {
    id: 'SIGEF_MOVIMENTACOES_2026',
    label: 'Movimentações publicadas no SIGEF - 2026',
    sourceId: 'SIGEF_EXTRATO',
    fiscalYear: 2026,
    state: 'ACTIVE',
    purpose: 'Movimentações bancárias públicas usadas para conciliação e acompanhamento do exercício.',
  },
  {
    id: 'SIGEF_LIBERACOES_2026',
    label: 'Liberações públicas do SIGEF - 2026',
    sourceId: 'SIGEF_LIBERACOES',
    fiscalYear: 2026,
    state: 'ACTIVE',
    purpose: 'Confirma ordem bancária e conta destinatária e serve como escalonamento quando o PDDEInfo informa pagamento sem evidência bancária suficiente.',
  },
  {
    id: 'BB_GESTAO_AGIL_MOVIMENTACOES_2026',
    label: 'Movimentações BB Gestão Ágil - 2026',
    sourceId: 'BB_GESTAO_AGIL',
    fiscalYear: 2026,
    state: 'CREDENTIAL_REQUIRED',
    purpose: 'Produto de dados preparado conceitualmente para reduzir a defasagem do SIGEF após credenciamento institucional.',
  },
  {
    id: 'PORTAL_TRANSPARENCIA_DOCUMENTOS_2026',
    label: 'Documentos e recursos recebidos no Portal da Transparência - 2026',
    sourceId: 'PORTAL_TRANSPARENCIA',
    fiscalYear: 2026,
    state: 'CREDENTIAL_REQUIRED',
    purpose: 'Validação independente por CNPJ da UEx de pagamentos/documentos SIAFI e recursos federais recebidos.',
  },
  {
    id: 'SIGPC_PUBLICO_PRESTACAO_2026',
    label: 'Situação pública de prestação no SiGPC - 2026',
    sourceId: 'SIGPC_PUBLICO',
    fiscalYear: 2026,
    state: 'PILOT_REQUIRED',
    purpose: 'Segunda evidência para prestação de contas, sem substituir a observação original do PDDEInfo.',
  },
  {
    id: 'FNDE_DADOS_ABERTOS_CONTROLE_2026',
    label: 'Dados Abertos FNDE como controle - 2026',
    sourceId: 'FNDE_DADOS_ABERTOS',
    fiscalYear: 2026,
    state: 'PILOT_REQUIRED',
    purpose: 'Backfill/controle condicionado à comprovação de que o recurso consultado realmente cobre o período de 2026.',
  },
  {
    id: 'PDDE_MONITORING_PANELS_CONTROLE_2026',
    label: 'Painéis oficiais do PDDE como controle - 2026',
    sourceId: 'PDDE_MONITORING_PANELS',
    fiscalYear: 2026,
    state: 'PILOT_REQUIRED',
    purpose: 'Controle secundário dos principais indicadores após comprovação de exportação estável e granularidade por escola/UEx.',
  },
];
