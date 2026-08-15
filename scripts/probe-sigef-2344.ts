#!/usr/bin/env node
import { collectSigefPublicAccount } from '../backend/adapters/sigef-public-statement';

const input = {
  cnpj: '01.959.159/0001-09',
  programCode: '0B',
  account: { bank: '001', agency: '3189', number: '2344-2' },
  startYear: 2026,
};

for (const startMonth of [1, 6, 7, 8]) {
  const result = await collectSigefPublicAccount({
    ...input,
    startMonth,
    maxPages: 500,
  });

  const movements2026 = result.movements.filter((movement) => movement.movementDate.startsWith('2026-'));
  console.log(JSON.stringify({
    startMonth,
    status: result.status,
    pagesFetched: result.pagesFetched,
    declaredTotal: result.declaredTotal,
    coverageThrough: result.coverageThrough,
    movements2026: movements2026.map((movement) => ({
      date: movement.movementDate,
      operation: movement.operation,
      amountCents: movement.amountCents,
      document: movement.document,
      history: movement.history,
      classification: movement.classification,
    })),
  }, null, 2));
}
