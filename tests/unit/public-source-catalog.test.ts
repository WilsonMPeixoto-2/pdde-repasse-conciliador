import { describe, expect, test } from 'vitest';
import { evidenceSourceSchema } from '../../backend/core/evidence';
import { DATA_PRODUCT_CATALOG, SOURCE_CATALOG } from '../../backend/core/source-catalog';

describe('governança das novas fontes públicas', () => {
  test('Portal da Transparência é dado público com credencial de API ainda requerida', () => {
    expect(SOURCE_CATALOG).toContainEqual(expect.objectContaining({
      id: 'PORTAL_TRANSPARENCIA',
      access: 'PUBLIC',
      integrationState: 'CREDENTIAL_REQUIRED',
    }));
    expect(DATA_PRODUCT_CATALOG).toContainEqual(expect.objectContaining({
      id: 'PORTAL_TRANSPARENCIA_DOCUMENTOS_2026',
      fiscalYear: 2026,
      state: 'CREDENTIAL_REQUIRED',
    }));
    expect(evidenceSourceSchema.parse('PORTAL_TRANSPARENCIA')).toBe('PORTAL_TRANSPARENCIA');
  });

  test('PDDEInfo registra capacidades dos relatórios públicos comprovadas em 2026', () => {
    const pddeInfo = SOURCE_CATALOG.find((item) => item.id === 'PDDEINFO');
    expect(pddeInfo?.capabilities).toEqual(expect.arrayContaining([
      'PAYMENT_ORDER_DATE',
      'ACCOUNTING_STATUS',
      'REPORTED_BALANCE',
    ]));
    expect(DATA_PRODUCT_CATALOG).toContainEqual(expect.objectContaining({
      id: 'PDDEINFO_PUBLIC_REPORTS_2026',
      sourceId: 'PDDEINFO',
      state: 'ACTIVE',
    }));
  });

  test('SIGEF Liberações é fonte ativa de escalonamento para pagamento sem evidência bancária', () => {
    expect(SOURCE_CATALOG).toContainEqual(expect.objectContaining({
      id: 'SIGEF_LIBERACOES',
      integrationState: 'ACTIVE',
      access: 'PUBLIC',
    }));
    expect(DATA_PRODUCT_CATALOG).toContainEqual(expect.objectContaining({
      id: 'SIGEF_LIBERACOES_2026',
      sourceId: 'SIGEF_LIBERACOES',
      state: 'ACTIVE',
    }));
  });

  test('SIGEF Extratos Gerais é público e fica em piloto até a descarga ser reproduzível sem contornar CAPTCHA', () => {
    expect(SOURCE_CATALOG).toContainEqual(expect.objectContaining({
      id: 'SIGEF_EXTRATOS_PUBLICOS',
      integrationState: 'PILOT_REQUIRED',
      access: 'PUBLIC',
      capabilities: expect.arrayContaining(['DATE_RANGE_FILTER', 'PROGRAM_FILTER']),
    }));
    expect(DATA_PRODUCT_CATALOG).toContainEqual(expect.objectContaining({
      id: 'SIGEF_EXTRATOS_PUBLICOS_2026',
      sourceId: 'SIGEF_EXTRATOS_PUBLICOS',
      state: 'PILOT_REQUIRED',
    }));
  });

  test('Olinda financeiro é fonte pública relevante, mas bloqueada enquanto o FNDE retorna erro de servidor', () => {
    expect(SOURCE_CATALOG).toContainEqual(expect.objectContaining({
      id: 'FNDE_OLINDA_FINANCEIRO',
      access: 'PUBLIC',
      integrationState: 'ACCESS_BLOCKED',
      capabilities: expect.arrayContaining([
        'AVAILABLE_ACCOUNT_RESOURCE_DATE',
        'AVAILABLE_ACCOUNT_RESOURCE',
      ]),
    }));
    expect(DATA_PRODUCT_CATALOG).toContainEqual(expect.objectContaining({
      id: 'FNDE_OLINDA_FINANCEIRO_2026',
      sourceId: 'FNDE_OLINDA_FINANCEIRO',
      state: 'ACCESS_BLOCKED',
    }));
  });

  test('não apresenta fontes de pesquisa como integração corrente', () => {
    for (const id of ['SIGEF_EXTRATOS_PUBLICOS', 'SIGPC_PUBLICO', 'FNDE_DADOS_ABERTOS', 'PDDE_MONITORING_PANELS'] as const) {
      expect(SOURCE_CATALOG.find((item) => item.id === id)?.integrationState).toBe('PILOT_REQUIRED');
    }
    expect(SOURCE_CATALOG.find((item) => item.id === 'FNDE_OLINDA_FINANCEIRO')?.integrationState).toBe('ACCESS_BLOCKED');
  });
});
