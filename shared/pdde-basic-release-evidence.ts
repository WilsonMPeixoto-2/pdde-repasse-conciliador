export type PddeBasicReleaseEvidenceState =
  | 'CREDIT_LOCATED'
  | 'RELEASE_CONFIRMED'
  | 'RELEASE_ACCOUNT_RECOVERED'
  | 'RELEASE_ACCOUNT_MISMATCH'
  | 'NO_RELEASE_EVIDENCE';

interface InstallmentLike {
  installment: string | null;
  paymentInformedCents: number;
  creditEvidence?: { status: string; amountCents?: number | null };
  note?: string | null;
  account?: { bank: string; agency: string; number: string } | null;
}

interface ProgramLike {
  name: string;
  installments: readonly InstallmentLike[];
}

export interface FirstCycleReleaseEvidenceSchoolLike {
  programs: readonly ProgramLike[];
}

export interface PddeBasicReleaseEvidenceReading {
  state: PddeBasicReleaseEvidenceState;
  hasIndependentSigefEvidence: boolean;
  destinationAccount: { bank: string; agency: string; number: string } | null;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ª/g, 'A')
    .replace(/º/g, 'O')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function isFirstCycle(programName: string, installment: string | null): boolean {
  const program = normalize(programName);
  const parcel = normalize(installment);
  if (!program.includes('PDDE BASICO')) return false;
  if (program.includes('PRIMEIRA INFANCIA')) return parcel === 'P1';
  return parcel === '1A PARCELA'
    || parcel === '1 PARCELA'
    || parcel.includes('PRIMEIRA PARCELA');
}

function creditLocated(installment: InstallmentLike): boolean {
  return normalize(installment.creditEvidence?.status) === 'CREDITO LOCALIZADO'
    && (installment.creditEvidence?.amountCents ?? 0) > 0;
}

export function derivePddeBasicFirstCycleReleaseEvidence(
  school: FirstCycleReleaseEvidenceSchoolLike,
): PddeBasicReleaseEvidenceReading {
  const installments = school.programs.flatMap((program) => program.installments
    .filter((installment) => isFirstCycle(program.name, installment.installment)));

  const credit = installments.find((installment) => installment.paymentInformedCents > 0 && creditLocated(installment));
  if (credit) {
    return {
      state: 'CREDIT_LOCATED',
      hasIndependentSigefEvidence: true,
      destinationAccount: credit.account ?? null,
    };
  }

  for (const installment of installments.filter((item) => item.paymentInformedCents > 0)) {
    const note = normalize(installment.note);
    if (note.includes('CONTA DIFERENTE')) {
      return {
        state: 'RELEASE_ACCOUNT_MISMATCH',
        hasIndependentSigefEvidence: true,
        destinationAccount: installment.account ?? null,
      };
    }
    if (note.includes('SIGEF LIBERACOES LOCALIZOU A LIBERACAO')) {
      return {
        state: 'RELEASE_CONFIRMED',
        hasIndependentSigefEvidence: true,
        destinationAccount: installment.account ?? null,
      };
    }
    if (note.includes('CONTA RECUPERADA NO SIGEF LIBERACOES')) {
      return {
        state: 'RELEASE_ACCOUNT_RECOVERED',
        hasIndependentSigefEvidence: true,
        destinationAccount: installment.account ?? null,
      };
    }
  }

  return {
    state: 'NO_RELEASE_EVIDENCE',
    hasIndependentSigefEvidence: false,
    destinationAccount: installments.find((item) => item.paymentInformedCents > 0)?.account ?? null,
  };
}

export function pddeBasicReleaseEvidenceLabel(state: PddeBasicReleaseEvidenceState): string {
  if (state === 'CREDIT_LOCATED') return 'Crédito compatível localizado no extrato SIGEF';
  if (state === 'RELEASE_CONFIRMED') return 'Liberação/OB localizada no SIGEF para a mesma conta';
  if (state === 'RELEASE_ACCOUNT_RECOVERED') return 'Liberação/OB localizada e conta de destino recuperada no SIGEF';
  if (state === 'RELEASE_ACCOUNT_MISMATCH') return 'SIGEF Liberações aponta conta diferente; requer conferência';
  return 'Sem evidência SIGEF suficiente do 1º ciclo nesta coleta';
}
