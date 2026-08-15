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
});
