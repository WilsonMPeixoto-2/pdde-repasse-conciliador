#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { fetchPddeInfoSchoolHtml } from '../backend/adapters/pddeinfo-http';
import { parsePddeInfoSchoolHtml } from '../backend/adapters/pddeinfo-html';
import { loadMasterSchools } from '../backend/application/school-catalog';

export async function probePddeInfoLive(inep = process.env.PDDE_CANARY_INEP?.trim() || '33069247') {
  const schools = await loadMasterSchools();
  const school = schools.find((item) => item.inep === inep);
  if (!school) throw new Error(`INEP canário ${inep} não pertence à lista-mestre da 4ª CRE.`);

  const response = await fetchPddeInfoSchoolHtml({
    fiscalYear: 2026,
    inep: school.inep,
    maxAttempts: 2,
    timeoutMs: 20_000,
    retryBackoffMs: 500,
  });
  const parsed = parsePddeInfoSchoolHtml(response.html, {
    expectedSchool: school,
    sourceUrl: response.sourceUrl,
  });
  if (parsed.finance.length < 1) {
    throw new Error(`Canário PDDEInfo sem destinações financeiras para ${school.inep}.`);
  }

  return {
    status: 'OK',
    inep: school.inep,
    sme: school.sme,
    financeRows: parsed.finance.length,
    accountsOnIndividualPage: parsed.accounts.length,
    parserAcceptedCurrentLayout: true,
    queriedAt: response.queriedAt,
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
