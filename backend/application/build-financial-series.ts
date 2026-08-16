import {
  financialAccountSnapshotSchema,
  financialSnapshotKey,
  type FinancialAccountSnapshot,
} from '../core/financial-snapshot';

export interface FinancialSeries {
  schoolInep: string;
  uexCnpj: string;
  programName: string;
  bank: string;
  agency: string;
  account: string;
  source: 'PDDEINFO';
  points: FinancialAccountSnapshot[];
}

function accountSeriesKey(snapshot: FinancialAccountSnapshot): string {
  return [
    snapshot.schoolInep,
    snapshot.uexCnpj,
    snapshot.programName.trim().toUpperCase(),
    snapshot.bank.trim().toUpperCase(),
    snapshot.agency.trim().toUpperCase(),
    snapshot.account.trim().toUpperCase(),
    snapshot.source,
  ].join('|');
}

export function buildFinancialSeries(rawSnapshots: readonly FinancialAccountSnapshot[]): FinancialSeries[] {
  const seen = new Set<string>();
  const groups = new Map<string, FinancialSeries>();

  for (const raw of rawSnapshots) {
    const snapshot = financialAccountSnapshotSchema.parse(raw);
    const snapshotKey = financialSnapshotKey(snapshot);
    if (seen.has(snapshotKey)) {
      throw new Error(`Snapshot financeiro duplicado: ${snapshotKey}.`);
    }
    seen.add(snapshotKey);

    const key = accountSeriesKey(snapshot);
    let group = groups.get(key);
    if (!group) {
      group = {
        schoolInep: snapshot.schoolInep,
        uexCnpj: snapshot.uexCnpj,
        programName: snapshot.programName,
        bank: snapshot.bank,
        agency: snapshot.agency,
        account: snapshot.account,
        source: snapshot.source,
        points: [],
      };
      groups.set(key, group);
    }
    group.points.push(snapshot);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      points: [...group.points].sort((left, right) => (
        left.referenceDate.localeCompare(right.referenceDate)
        || left.collectedAt.localeCompare(right.collectedAt)
      )),
    }))
    .sort((left, right) => (
      left.schoolInep.localeCompare(right.schoolInep)
      || left.programName.localeCompare(right.programName, 'pt-BR')
      || left.account.localeCompare(right.account)
    ));
}
