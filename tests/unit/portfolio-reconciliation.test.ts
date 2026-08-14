import { describe, expect, test } from 'vitest';
import type { PddePayment, SigefMovement, SigefRelease, SourceSnapshot } from '../../backend/core/schemas';

const subjectUrl = new URL('../../backend/core/portfolio-reconciliation.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const account = { bank: '001', agency: '0249', number: '00012345X' };
const school = {
  inep: '33000001', sme: '0410001', name: 'EM Exemplo',
  uex: 'CAIXA ESCOLAR EM EXEMPLO', cnpj: '12345678000190',
};

function payment(installmentCode: string, amountPaidCents: number, withAccount = true): PddePayment {
  return {
    id: `payment-${installmentCode}`,
    school,
    fiscalYear: 2026,
    programCode: '02',
    programName: 'PDDE',
    actionCode: 'PDDE_BASICO',
    actionName: 'PDDE Básico',
    installmentCode,
    installmentLabel: `${installmentCode}ª Parcela`,
    amountOriginalDueCents: amountPaidCents,
    adjustmentCents: 0,
    amountFinalDueCents: amountPaidCents,
    amountPaidCents,
    ...(amountPaidCents > 0 ? { paymentDate: '2026-05-22' } : {}),
    ...(withAccount ? { account } : {}),
    sourceReference: {
      source: 'PDDEINFO',
      url: 'https://www.fnde.gov.br/pddeinfo/exemplo',
      rawDestination: `PDDE / PDDE Básico - ${installmentCode}ª Parcela`,
    },
  };
}

const release: SigefRelease = {
  id: 'release-1',
  schoolCnpj: school.cnpj,
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
};

const movement: SigefMovement = {
  id: 'movement-1',
  schoolCnpj: school.cnpj,
  programCode: '02',
  operation: 'credit',
  amountCents: 506_500,
  movementDate: '2026-05-22',
  account,
  document: '900001',
  history: 'ORDEM BANCARIA',
};

const pddeInfoSource: SourceSnapshot = {
  source: 'PDDEINFO', status: 'available',
  queriedAt: '2026-08-11T23:45:00-03:00', coverageThrough: '2026-08-11',
};
const releaseSource: SourceSnapshot = {
  source: 'SIGEF_LIBERACOES', status: 'available',
  queriedAt: '2026-08-11T23:46:00-03:00', coverageThrough: '2026-08-11',
};
const movementSource: SourceSnapshot = {
  source: 'SIGEF_MOVIMENTACOES', status: 'available',
  queriedAt: '2026-08-11T23:47:00-03:00', coverageThrough: '2026-08-11',
};

async function reconcilePortfolio(input: Record<string, unknown>) {
  const subject = await loadSubject();
  expect(subject, 'o fluxo de carteira ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.reconcilePortfolio).toBeTypeOf('function');
  return (subject.reconcilePortfolio as (value: Record<string, unknown>) => Record<string, unknown>)(input);
}

function completeInput(payments: PddePayment[]) {
  return {
    payments,
    releases: [release],
    movements: [movement],
    sources: {
      pddeInfo: pddeInfoSource,
      sigefMovements: movementSource,
      sigefReleases: [{
        schoolCnpj: school.cnpj,
        programCode: '02',
        snapshot: releaseSource,
      }],
    },
  };
}

describe('reconcilePortfolio', () => {
  test('isola as parcelas e não usa a liberação da primeira na segunda', async () => {
    const result = await reconcilePortfolio(completeInput([
      payment('1', 506_500),
      payment('2', 0),
    ]));

    expect(result?.rows).toEqual([
      expect.objectContaining({
        payment: expect.objectContaining({ id: 'payment-1' }),
        reconciliation: expect.objectContaining({ status: 'REPASSE_CONFIRMADO' }),
      }),
      expect.objectContaining({
        payment: expect.objectContaining({ id: 'payment-2' }),
        reconciliation: expect.objectContaining({ status: 'SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA' }),
      }),
    ]);
    expect(result?.summary).toMatchObject({
      total: 2,
      confirmed: 1,
      noPayment: 1,
      requiringHumanReview: 0,
    });
  });

  test('completa conta ausente somente com a destinatária da liberação e registra a procedência', async () => {
    const result = await reconcilePortfolio(completeInput([payment('1', 506_500, false)]));

    expect(result?.rows).toEqual([
      expect.objectContaining({
        accountResolution: {
          pddeInfoAccount: null,
          sigefDestinationAccount: account,
          effectiveAccount: account,
          source: 'SIGEF_LIBERACOES',
          correspondence: 'SIGEF_ONLY',
        },
      }),
    ]);
  });

  test('preserva a conta comprovada pela liberação mesmo quando o crédito foi estornado', async () => {
    const input = completeInput([payment('1', 506_500, false)]);
    input.movements.push({
      ...movement,
      id: 'movement-reversal',
      operation: 'debit',
      history: 'ESTORNO DE ORDEM BANCARIA',
    });

    const result = await reconcilePortfolio(input);

    expect(result?.rows).toEqual([
      expect.objectContaining({
        reconciliation: expect.objectContaining({
          reasonCode: 'MOVEMENT_REVERSAL_FOUND',
        }),
        accountResolution: {
          pddeInfoAccount: null,
          sigefDestinationAccount: account,
          effectiveAccount: account,
          source: 'SIGEF_LIBERACOES',
          correspondence: 'SIGEF_ONLY',
        },
      }),
    ]);
    expect(result?.summary).toMatchObject({
      divergent: 1,
      accountsCompletedFromSigef: 1,
      accountsMissing: 0,
    });
  });

  test('mantém consulta inconclusiva quando a liberação daquele CNPJ e programa não foi importada', async () => {
    const input = completeInput([payment('1', 506_500)]);
    input.sources.sigefReleases = [];

    const result = await reconcilePortfolio(input);

    expect(result?.rows).toEqual([
      expect.objectContaining({
        reconciliation: expect.objectContaining({
          status: 'CONSULTA_INCONCLUSIVA',
          reasonCode: 'RELEASE_SOURCE_UNAVAILABLE',
        }),
      }),
    ]);
    expect(result?.summary).toMatchObject({ total: 1, inconclusive: 1, requiringHumanReview: 1 });
  });
});
