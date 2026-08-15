export type SourceAccess = 'PUBLIC' | 'INSTITUTIONAL';
export type SourceIntegrationState = 'ACTIVE' | 'CREDENTIAL_REQUIRED';

export interface InstitutionalSourceCatalogItem {
  id: 'PDDEINFO' | 'SIGEF_EXTRATO' | 'BB_GESTAO_AGIL';
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
    | 'SIGEF_MOVIMENTACOES_2026'
    | 'BB_GESTAO_AGIL_MOVIMENTACOES_2026';
  label: string;
  sourceId: InstitutionalSourceCatalogItem['id'];
  fiscalYear: 2026;
  state: 'ACTIVE' | 'CREDENTIAL_REQUIRED';
  purpose: string;
}

/**
 * Catálogo de capacidades do produto. Ele descreve o que o sistema usa hoje e
 * o que já foi identificado como integração institucional possível, sem
 * confundir descoberta técnica com credencial disponível.
 */
export const SOURCE_CATALOG: InstitutionalSourceCatalogItem[] = [
  {
    id: 'PDDEINFO',
    label: 'PDDEInfo',
    authority: 'FNDE',
    access: 'PUBLIC',
    integrationState: 'ACTIVE',
    purpose: 'Programação, pagamento informado, contas exibidas e saldos informados pelo PDDEInfo.',
    capabilities: [
      'PROGRAMMED_TRANSFERS',
      'PAID_INFORMED',
      'CURRENT_ACCOUNT',
      'REPORTED_BALANCE',
      'SCHOOL_CNPJ',
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
    id: 'BB_GESTAO_AGIL',
    label: 'BB Gestão Ágil',
    authority: 'Banco do Brasil / FNDE',
    access: 'INSTITUTIONAL',
    integrationState: 'CREDENTIAL_REQUIRED',
    purpose: 'Fonte institucional identificada para movimentações tempestivas. A integração ainda não possui credencial configurada.',
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
];

export const DATA_PRODUCT_CATALOG: InstitutionalDataProduct[] = [
  {
    id: 'PDDEINFO_REPASSES_2026',
    label: 'Repasses e situação informada no PDDEInfo - 2026',
    sourceId: 'PDDEINFO',
    fiscalYear: 2026,
    state: 'ACTIVE',
    purpose: 'Base programática do monitoramento: valores programados, pagamentos informados, ações e contas.',
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
    id: 'BB_GESTAO_AGIL_MOVIMENTACOES_2026',
    label: 'Movimentações BB Gestão Ágil - 2026',
    sourceId: 'BB_GESTAO_AGIL',
    fiscalYear: 2026,
    state: 'CREDENTIAL_REQUIRED',
    purpose: 'Produto de dados preparado conceitualmente para reduzir a defasagem do SIGEF após credenciamento institucional.',
  },
];
