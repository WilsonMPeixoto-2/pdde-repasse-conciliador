import { describe, expect, test } from 'vitest';
import { createInstitutionalApi } from '../../backend/api/institutional-api';

const COMMAND_TOKEN = 'pdde-admin-test-token-2026-antonieta-catalog';

function api() {
  return createInstitutionalApi({
    readService: {
      listSchools: () => ({ items: [], total: 163 }),
      getSchool: () => null,
      getSchoolHistory: async () => null,
      listExecutions: async () => ({ items: [] }),
      getExecution: async () => null,
      listFindings: async () => ({ items: [], total: 0 }),
      listArtifacts: async () => [],
      getCurrentReport: async () => null,
    },
    commandService: {
      requestPddeInfo: async () => ({}),
      requestMonitoring: async () => ({}),
      requestReconciliation: async () => ({}),
    },
    artifactStore: {
      createSignedDownload: async () => ({ url: 'https://example.invalid', expiresAt: '2026-08-15T01:00:00Z' }),
    },
    artifactIntakeService: {
      requestUpload: async () => ({}),
      confirmUpload: async () => ({}),
    },
    commandToken: COMMAND_TOKEN,
    verifyEvidence: async () => ({ valid: true, events: 0 }),
    version: '0.5.0',
  });
}

describe('metadados institucionais de fontes', () => {
  test('expõe fontes ativas e BB Gestão Ágil sem fingir que a credencial já existe', async () => {
    const response = await api()(new Request('http://localhost/api/meta'));
    const body = await response.json() as any;

    expect(body.sourceCatalog).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'PDDEINFO',
        access: 'PUBLIC',
        integrationState: 'ACTIVE',
      }),
      expect.objectContaining({
        id: 'SIGEF_EXTRATO',
        access: 'PUBLIC',
        integrationState: 'ACTIVE',
      }),
      expect.objectContaining({
        id: 'BB_GESTAO_AGIL',
        access: 'INSTITUTIONAL',
        integrationState: 'CREDENTIAL_REQUIRED',
        capabilities: expect.arrayContaining([
          'BANK_TRANSACTIONS',
          'CNPJ_FILTER',
          'PROGRAM_FILTER',
          'DATE_RANGE_FILTER',
          'CREDIT_DEBIT_FILTER',
          'CATEGORY_FILTER',
          'XLSX_EXPORT',
        ]),
      }),
    ]));

    expect(body.dataProducts).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'PDDEINFO_REPASSES_2026', sourceId: 'PDDEINFO', state: 'ACTIVE' }),
      expect.objectContaining({ id: 'SIGEF_MOVIMENTACOES_2026', sourceId: 'SIGEF_EXTRATO', state: 'ACTIVE' }),
      expect.objectContaining({
        id: 'BB_GESTAO_AGIL_MOVIMENTACOES_2026',
        sourceId: 'BB_GESTAO_AGIL',
        state: 'CREDENTIAL_REQUIRED',
      }),
    ]));
  });
});
