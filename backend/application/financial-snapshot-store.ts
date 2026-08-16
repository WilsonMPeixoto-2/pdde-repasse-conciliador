import type { FinancialAccountSnapshot } from '../core/financial-snapshot';

export interface FinancialSnapshotStore {
  append(snapshot: FinancialAccountSnapshot): Promise<FinancialAccountSnapshot>;
}
