import { fetchPddeInfoPublicReport } from '../backend/adapters/pddeinfo-public-reports';

const INEP = '33069247';

async function main(): Promise<void> {
  const attendance = await fetchPddeInfoPublicReport({
    filter: { kind: 'ATTENDANCE', fiscalYear: 2026, inep: INEP, uf: 'RJ', administrationSphere: 2 },
  });
  const school = attendance.rows.find((row) => row['Código Escola'] === INEP);
  if (!school) throw new Error('Atendimento 2026 não retornou o INEP piloto.');
  const cnpj = school['CNPJ Executora']?.replace(/\D/g, '');
  if (!cnpj || !/^\d{14}$/.test(cnpj)) throw new Error('Atendimento não retornou CNPJ válido da UEx piloto.');

  const accounting = await fetchPddeInfoPublicReport({
    filter: { kind: 'ACCOUNTING', fiscalYear: 2026, inep: INEP, uf: 'RJ', administrationSphere: 2 },
  });
  if (!accounting.rows.some((row) => row['Código da Escola'] === INEP)) {
    throw new Error('Prestação de contas 2026 não retornou o INEP piloto.');
  }

  const balance = await fetchPddeInfoPublicReport({
    filter: { kind: 'BALANCE', month: '06-2026', cnpj, uf: 'RJ', administrationSphere: 2 },
  });

  let accountOpeningError: string | null = null;
  try {
    await fetchPddeInfoPublicReport({
      filter: { kind: 'ACCOUNT_OPENING', fiscalYear: 2026, inep: INEP, uf: 'RJ', administrationSphere: 2 },
    });
  } catch (cause) {
    accountOpeningError = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
  }

  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    inep: INEP,
    cnpj,
    attendance: {
      via: attendance.via,
      rows: attendance.rows.length,
      headers: attendance.headers,
      pilot: school,
    },
    accounting: {
      via: accounting.via,
      rows: accounting.rows.length,
      headers: accounting.headers,
    },
    balance: {
      via: balance.via,
      coverageThrough: balance.coverageThrough,
      rows: balance.rows.length,
      headers: balance.headers,
      firstRows: balance.rows.slice(0, 5),
    },
    accountOpeningError,
  }, null, 2));
}

await main();
