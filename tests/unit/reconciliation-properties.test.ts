import { expect } from 'vitest';
import { fc, test } from '@fast-check/vitest';
import { sumMoneyCents } from '../../backend/core/money';
import { reconcileRepasse } from '../../backend/core/reconciliation';
import type { PddePayment, SigefMovement, SigefRelease, SourceSnapshot } from '../../backend/core/schemas';

const account = { bank: '001', agency: '1234', number: '98765-4' };
const available = (coverageThrough = '2026-12-31'): SourceSnapshot => ({
  source: 'PDDEINFO', status: 'available', queriedAt: '2026-08-15T20:00:00-03:00', coverageThrough,
});

function payment(amountPaidCents: number): PddePayment {
  return {
    id: 'p1',
    school: { inep: '33069247', sme: '0431021', name: 'UE Teste', uex: 'UEx Teste', cnpj: '12345678000190' },
    fiscalYear: 2026,
    programCode: '02', programName: 'PDDE Básico', actionCode: '01', actionName: 'PDDE Básico',
    installmentCode: '1', installmentLabel: '1ª Parcela',
    amountOriginalDueCents: amountPaidCents, adjustmentCents: 0, amountFinalDueCents: amountPaidCents,
    amountPaidCents, paymentDate: '2026-08-01', account,
    sourceReference: { source: 'PDDEINFO', url: 'https://www.fnde.gov.br/pddeinfo', rawDestination: 'PDDE Básico' },
  };
}

function release(amountCents: number): SigefRelease {
  return {
    id: 'r1', schoolCnpj: '12345678000190', fiscalYear: 2026,
    programCode: '02', programName: 'PDDE Básico', actionCode: '01', installmentCode: '1',
    amountCents, paymentDate: '2026-08-01', orderBank: 'OB123', destinationAccount: account,
    sourceReference: { source: 'SIGEF_LIBERACOES', url: 'https://www.fnde.gov.br/sigef', rawProgram: 'PDDE Básico' },
  };
}

function movement(amountCents: number, index: number): SigefMovement {
  return {
    id: `m${index}`, schoolCnpj: '12345678000190', programCode: '02', operation: 'credit',
    amountCents, movementDate: '2026-08-01', account, document: 'OB123', history: 'ORDEM BANCARIA FNDE',
  };
}

const sources = (movementStatus: SourceSnapshot['status'] = 'available') => ({
  pddeInfo: available(),
  sigefReleases: { ...available(), source: 'SIGEF_LIBERACOES' as const },
  sigefMovements: { ...available(), source: 'SIGEF_MOVIMENTACOES' as const, status: movementStatus },
});

test.prop([fc.array(fc.integer({ min: -1_000_000, max: 1_000_000 }), { maxLength: 50 })])(
  'soma de centavos é exatamente igual ao total em BigInt dentro da faixa segura',
  (values) => {
    const expected = Number(values.reduce((total, value) => total + BigInt(value), 0n));
    expect(sumMoneyCents(values)).toBe(expected);
    expect(Number.isSafeInteger(sumMoneyCents(values))).toBe(true);
  },
);

test.prop([fc.array(fc.integer({ min: 1, max: 100_000 }), { minLength: 1, maxLength: 8 })])(
  'reordenar movimentos equivalentes não altera status nem total conciliado',
  (parts) => {
    const total = parts.reduce((sum, value) => sum + value, 0);
    const movements = parts.map((value, index) => movement(value, index));
    const forward = reconcileRepasse({ payment: payment(total), releases: [release(total)], movements, sources: sources() });
    const reversed = reconcileRepasse({ payment: payment(total), releases: [release(total)], movements: [...movements].reverse(), sources: sources() });
    expect(forward.status).toBe('REPASSE_CONFIRMADO');
    expect(reversed.status).toBe(forward.status);
    expect(reversed.movementTotalCents).toBe(forward.movementTotalCents);
    expect(forward.movementTotalCents).toBe(total);
  },
);

test.prop([fc.integer({ min: 1, max: 10_000_000 })])(
  'fonte de movimentos indisponível nunca vira confirmação de repasse',
  (amount) => {
    const result = reconcileRepasse({
      payment: payment(amount), releases: [release(amount)], movements: [], sources: sources('unavailable'),
    });
    expect(result.status).toBe('CONSULTA_INCONCLUSIVA');
    expect(result.status).not.toBe('REPASSE_CONFIRMADO');
    expect(result.reasonCode).toBe('MOVEMENT_SOURCE_UNAVAILABLE');
  },
);
