#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { collectPddeInfoSchoolWithFallback } from '../backend/application/collect-pddeinfo-school-with-fallback';
import { loadMasterSchools } from '../backend/application/school-catalog';

export async function probePddeInfoLive(inep = process.env.PDDE_CANARY_INEP?.trim() || '33069247') {
  const schools = await loadMasterSchools();
  const school = schools.find((item) => item.inep === inep);
  if (!school) throw new Error(`INEP canário ${inep} não pertence à lista-mestre da 4ª CRE.`);

  const result = await collectPddeInfoSchoolWithFallback({
    school,
    fiscalYear: 2026,
  });
  if (result.school.finance.length < 1) {
    throw new Error(`Canário PDDEInfo sem destinações financeiras para ${school.inep}.`);
  }

  return {
    status: 'OK',
    inep: school.inep,
    sme: school.sme,
    financeRows: result.school.finance.length,
    accountsOnIndividualPage: result.school.accounts.length,
    acquisitionVia: result.via,
    parserAcceptedCurrentLayout: true,
    queriedAt: result.queriedAt,
  };
}

const executedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executedAsScript) {
  probePddeInfoLive()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((cause) => {
      console.error(cause instanceof Error ? cause.stack ?? cause.message : String(cause));
      process.exitCode = 1;
    });
}
