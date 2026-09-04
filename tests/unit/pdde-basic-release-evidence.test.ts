import { describe, expect, test } from 'vitest';
import {
  derivePddeBasicFirstCycleReleaseEvidence,
  pddeBasicReleaseEvidenceLabel,
} from '../../shared/pdde-basic-release-evidence';

const baseSchool = {
  programs: [{
    name: 'PDDE Básico',
    installments: [{
      installment: '1ª Parcela',
      paymentInformedCents: 418_500,
      paymentInformedDate: '2026-08-05',
      creditEvidence: { status: 'Crédito não localizado', amountCents: null },
      note: 'SIGEF Liberações localizou a liberação pela OB 019072 para a mesma conta informada; isso confirma a ordem/destino, mas não substitui a localização do crédito no extrato.',
      account: { bank: '001', agency: '0249', number: '0000549789' },
      releaseEvidence: {
        status: 'CONFIRMED' as const,
        paymentDate: '2026-08-05',
        orderBank: '019072',
        sourceUrl: 'https://www.fnde.gov.br/sigefweb/liberacoes',
        account: { bank: '001', agency: '0249', number: '0000549789' },
      },
    }],
  }],
};

describe('evidência do 1º ciclo do PDDE Básico', () => {
  test('classifica o extrato como defasado quando sua cobertura termina antes da liberação', () => {
    const reading = derivePddeBasicFirstCycleReleaseEvidence({
      ...baseSchool,
      accounts: [{
        bank: '001',
        agency: '0249',
        account: '0000549789',
        statementCoverageThrough: '2025-12-31',
      }],
    });

    expect(reading.state).toBe('RELEASE_CONFIRMED');
    expect(reading.releaseDate).toBe('2026-08-05');
    expect(reading.orderBank).toBe('019072');
    expect(reading.statementCoverageThrough).toBe('2025-12-31');
    expect(reading.extractFreshness).toBe('STALE_BEFORE_RELEASE');
    expect(reading.needsFreshExtract).toBe(true);
    expect(pddeBasicReleaseEvidenceLabel(reading)).toContain('extrato SIGEF defasado');
  });

  test('detecta a mesma defasagem usando somente nota da liberação e movimentos da visão humana real', () => {
    const withoutStructuredRelease = {
      programs: [{
        name: 'PDDE Básico',
        installments: [{
          installment: '1ª Parcela',
          paymentInformedCents: 418_500,
          paymentInformedDate: '2026-08-05',
          creditEvidence: { status: 'Crédito não localizado', amountCents: null },
          note: 'SIGEF Liberações localizou a liberação pela OB 019072 para a mesma conta informada; isso confirma a ordem/destino, mas não substitui a localização do crédito no extrato.',
          account: { bank: '001', agency: '0249', number: '0000549789' },
        }],
      }],
      accounts: [{
        bank: '001',
        agency: '0249',
        account: '0000549789',
        movements: [
          { date: '2025-11-30' },
          { date: '2025-12-31' },
        ],
      }],
    };

    const reading = derivePddeBasicFirstCycleReleaseEvidence(withoutStructuredRelease);
    expect(reading.state).toBe('RELEASE_CONFIRMED');
    expect(reading.orderBank).toBe('019072');
    expect(reading.statementCoverageThrough).toBe('2025-12-31');
    expect(reading.extractFreshness).toBe('STALE_BEFORE_RELEASE');
  });

  test('não chama de defasado o extrato que cobre data igual ou posterior à liberação', () => {
    const reading = derivePddeBasicFirstCycleReleaseEvidence({
      ...baseSchool,
      accounts: [{
        bank: '001',
        agency: '0249',
        account: '0000549789',
        statementCoverageThrough: '2026-08-10',
      }],
    });

    expect(reading.extractFreshness).toBe('CURRENT_THROUGH_RELEASE');
    expect(reading.needsFreshExtract).toBe(false);
    expect(pddeBasicReleaseEvidenceLabel(reading)).not.toContain('defasado');
  });
});
