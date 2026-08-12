import { describe, expect, test } from 'vitest';
import type { PddeInfoNormalizationResult } from '../../backend/adapters/pddeinfo-normalizer';
import type { SigefMovementCsvResult } from '../../backend/adapters/sigef-movements-csv';
import type { SigefReleaseHtmlResult } from '../../backend/adapters/sigef-releases-html';

const subjectUrl = new URL('../../backend/application/reconciliation-pipeline.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const account = { bank: '001', agency: '0249', number: '00012345X' };
const queriedAt = '2026-08-11T23:45:00-03:00';

const pddeInfo: PddeInfoNormalizationResult = {
  payments: [{
    id: 'payment-1',
    school: {
      inep: '33000001', sme: '0410001', name: 'EM Exemplo',
      uex: 'CAIXA ESCOLAR EM EXEMPLO', cnpj: '12345678000190',
    },
    fiscalYear: 2026,
    programCode: '02',
    programName: 'PDDE',
    actionCode: 'PDDE_BASICO',
    actionName: 'PDDE Básico',
    installmentCode: '1',
    installmentLabel: '1ª Parcela',
    amountOriginalDueCents: 506_500,
    adjustmentCents: 0,
    amountFinalDueCents: 506_500,
    amountPaidCents: 506_500,
    paymentDate: '2026-05-22',
    account,
    sourceReference: {
      source: 'PDDEINFO',
      url: 'https://www.fnde.gov.br/pddeinfo/exemplo',
      rawDestination: 'PDDE / PDDE Básico - 1ª Parcela',
    },
  }],
  source: {
    source: 'PDDEINFO', status: 'available', queriedAt, coverageThrough: '2026-08-11',
  },
  statistics: {
    schools: 1, financialRecords: 1, paidRecords: 1,
    missingProgramAccounts: 0, ignoredZeroRecords: 0,
  },
  warnings: [],
};

const releaseExport: SigefReleaseHtmlResult = {
  query: { fiscalYear: 2026, programCode: '02' },
  entity: { cnpj: '12345678000190', name: 'CAIXA ESCOLAR', state: 'RJ', city: 'RIO DE JANEIRO' },
  releases: [{
    id: 'release-1',
    schoolCnpj: '12345678000190',
    fiscalYear: 2026,
    programCode: '02',
    programName: 'PDDE',
    actionCode: 'PDDE_BASICO',
    installmentCode: '1',
    amountCents: 506_500,
    paymentDate: '2026-05-22',
    orderBank: '900001',
    destinationAccount: account,
    sourceReference: {
      source: 'SIGEF_LIBERACOES',
      url: 'https://www.fnde.gov.br/sigefweb/liberacoes/exemplo',
      rawProgram: 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026',
    },
  }],
  source: {
    source: 'SIGEF_LIBERACOES', status: 'available', queriedAt, coverageThrough: '2026-08-11',
  },
  statistics: { releaseRows: 1, tables: 1 },
};

const movements: SigefMovementCsvResult = {
  movements: [{
    id: 'movement-1',
    schoolCnpj: '12345678000190',
    programCode: '02',
    operation: 'credit',
    amountCents: 506_500,
    movementDate: '2026-05-22',
    account,
    document: '900001',
    history: 'ORDEM BANCARIA',
  }],
  source: {
    source: 'SIGEF_MOVIMENTACOES', status: 'available', queriedAt, coverageThrough: '2026-08-11',
  },
  statistics: {
    rowsRead: 1, eligibleProgramRows: 1, targetRows: 1,
    creditRows: 1, debitRows: 0, requestedThrough: '2026-08-11', coverageLagDays: 0,
  },
};

async function assemble(input: unknown) {
  const subject = await loadSubject();
  expect(subject, 'o orquestrador ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.assembleReconciliationPortfolio).toBeTypeOf('function');
  return (subject.assembleReconciliationPortfolio as (value: unknown) => ReturnType<typeof Object>)(input);
}

describe('assembleReconciliationPortfolio', () => {
  test('conecta as três fontes e confirma a correspondência exata', async () => {
    const result = await assemble({ pddeInfo, releaseExports: [releaseExport], movements });

    expect(result?.summary).toMatchObject({ total: 1, confirmed: 1, requiringHumanReview: 0 });
    expect(result?.rows).toEqual([
      expect.objectContaining({
        reconciliation: expect.objectContaining({ status: 'REPASSE_CONFIRMADO' }),
      }),
    ]);
  });

  test('materializa indisponibilidade quando nenhum XLS de liberações foi incorporado', async () => {
    const result = await assemble({ pddeInfo, releaseExports: [], movements });

    expect(result?.summary).toMatchObject({ total: 1, inconclusive: 1, requiringHumanReview: 1 });
    expect(result?.rows).toEqual([
      expect.objectContaining({
        reconciliation: expect.objectContaining({ reasonCode: 'RELEASE_SOURCE_UNAVAILABLE' }),
      }),
    ]);
  });

  test('rejeita duas exportações para a mesma entidade, exercício e programa', async () => {
    await expect(assemble({
      pddeInfo,
      releaseExports: [releaseExport, releaseExport],
      movements,
    })).rejects.toThrow(/duplicada/i);
  });
});
