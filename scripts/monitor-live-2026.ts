#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonicalAccount, canonicalText } from '../backend/core/normalization';
import { fetchPddeInfoSchoolHtml } from '../backend/adapters/pddeinfo-http';
import { parsePddeInfoSchoolHtml, type PddeInfoRawSchool } from '../backend/adapters/pddeinfo-html';
import { normalizePddeInfoSchools } from '../backend/adapters/pddeinfo-normalizer';
import { collectSigefPublicAccount, type SigefMovementClass } from '../backend/adapters/sigef-public-statement';
import { loadMasterSchools } from '../backend/application/school-catalog';

const DEFAULT_INEPS = ['33069247','33069093','33069433','33069379','33069271','33069409','33069360','33069468','33069220','33069328'];
const CLASSIFICATIONS:SigefMovementClass[]=['REPASSE_FNDE','APLICACAO_FINANCEIRA','RESGATE_APLICACAO','PAGAMENTO_TRANSFERENCIA','PAGAMENTO_CARTAO','RENDIMENTO_FINANCEIRO','ENTRADA_TERCEIRO','TARIFA_BANCARIA','ESTORNO_REVERSAO','MOVIMENTO_NAO_CLASSIFICADO'];

function args(argv:string[]){
  const map=new Map<string,string>();
  for(let i=0;i<argv.length;i+=2){const key=argv[i],value=argv[i+1];if(!key?.startsWith('--')||!value)throw new Error(`Argumentos inválidos perto de ${key??'(fim)'}.`);map.set(key,value);}
  const year=Number(map.get('--year')??'2026'); if(!Number.isInteger(year)||year<2000||year>2100)throw new Error('--year inválido.');
  const ineps=(map.get('--ineps')?.split(',').map(v=>v.trim()).filter(Boolean)??DEFAULT_INEPS); if(ineps.some(v=>!/^\d{8}$/.test(v)))throw new Error('--ineps contém INEP inválido.');
  return {year,ineps,workspace:resolve(map.get('--workspace')??'.tmp/monitor-live-2026'),output:resolve(map.get('--output')??'artifacts/monitor-live-2026.json')};
}
function programCode(raw:string):string|null{const v=canonicalText(raw);if(v==='PDDE'||v==='PDDE BASICO')return'02';if(v==='PDDE QUALIDADE')return'0B';if(v==='PDDE EQUIDADE')return'0A';if(v==='PDDE EDUCACAO INTEGRAL')return'Z9';return null;}
function money(raw:string):number|null{const m=raw.trim().replace(/^R\$\s*/,'').match(/^(-)?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/);if(!m)return null;let c=BigInt(m[2].replace(/\./g,''))*100n+BigInt(m[3]);if(m[1])c=-c;return Number(c);}
function hash(bytes:Buffer){return createHash('sha256').update(bytes).digest('hex');}
function emptyTotals(){return Object.fromEntries(CLASSIFICATIONS.map(c=>[c,0])) as Record<SigefMovementClass,number>;}

export async function main(argv=process.argv.slice(2)){
  const opt=args(argv); await rm(opt.workspace,{recursive:true,force:true}); await mkdir(opt.workspace,{recursive:true});
  const master=await loadMasterSchools(); const selected=opt.ineps.map(inep=>{const s=master.find(v=>v.inep===inep);if(!s)throw new Error(`INEP ${inep} não está na lista-mestre.`);return s;});
  const schools:PddeInfoRawSchool[]=[]; const pddeMeta:Record<string,{queriedAt:string;rawSha256:string}>={};
  for(const school of selected){
    const http=await fetchPddeInfoSchoolHtml({fiscalYear:opt.year,inep:school.inep,maxAttempts:3});
    const parsed=parsePddeInfoSchoolHtml(http.html,{expectedSchool:school,sourceUrl:http.sourceUrl}); schools.push(parsed);
    const raw=http.rawBytes??Buffer.from(http.html,'utf8'); const path=join(opt.workspace,'pddeinfo',`${school.inep}.html`);await mkdir(dirname(path),{recursive:true});await writeFile(path,raw);
    pddeMeta[school.inep]={queriedAt:http.queriedAt,rawSha256:hash(raw)};
  }
  const pdde=normalizePddeInfoSchools(schools,{fiscalYear:opt.year,queriedAt:new Date().toISOString()});
  const schoolResults=[] as Array<Record<string,unknown>>; let complete=true;
  for(const school of schools){
    const accounts=[] as Array<Record<string,unknown>>; const seen=new Set<string>();
    for(const raw of school.accounts){
      const code=programCode(raw.programa); if(!code||!raw.banco.trim()||!raw.agencia.trim()||!raw.conta.trim())continue;
      const account={bank:raw.banco.trim(),agency:raw.agencia.trim(),number:raw.conta.trim()};const key=`${code}|${canonicalAccount(account)}`;if(seen.has(key))continue;seen.add(key);
      const rawDir=join(opt.workspace,'sigef',school.inep,code,account.number.replace(/[^0-9A-Z]/gi,'_'));
      const statement=await collectSigefPublicAccount({cnpj:school.cnpj,programCode:code,account,startYear:opt.year,startMonth:1,maxPages:500,onPage:async page=>{await mkdir(rawDir,{recursive:true});await writeFile(join(rawDir,`page-${String(page.index).padStart(3,'0')}.html`),page.rawBytes);}});
      if(statement.status!=='COMPLETE')complete=false;
      const inYear=statement.movements.filter(m=>m.movementDate.startsWith(`${opt.year}-`)); const totals=emptyTotals(); for(const m of inYear)totals[m.classification]+=m.amountCents;
      accounts.push({programCode:code,programLabel:raw.programa,account,saldoPddeInfoCents:money(raw.saldo),status:statement.status,pagesFetched:statement.pagesFetched,declaredTotal:statement.declaredTotal,uniqueMovements:statement.movements.length,movementsInYear:inYear.length,coverageThrough:statement.coverageThrough,totals,movements:inYear});
    }
    schoolResults.push({inep:school.inep,sme:school.sme,name:school.nome,uex:school.uex,cnpj:school.cnpj,pddeInfo:pddeMeta[school.inep],repasses:pdde.payments.filter(p=>p.school.inep===school.inep).map(p=>({programCode:p.programCode,action:p.actionName,installment:p.installmentLabel,previstoCents:p.amountFinalDueCents,pagoInformadoCents:p.amountPaidCents,dataOrdem:p.paymentDate??null,account:p.account??null})),accounts});
  }
  const allAccounts=schoolResults.flatMap(s=>(s.accounts as Array<any>)); const summaryTotals=emptyTotals();let movementsInYear=0,historical=0,balances=0;
  for(const a of allAccounts){for(const c of CLASSIFICATIONS)summaryTotals[c]+=a.totals[c];movementsInYear+=a.movementsInYear;historical+=a.uniqueMovements;balances+=a.saldoPddeInfoCents??0;}
  const result={version:1,generatedAt:new Date().toISOString(),fiscalYear:opt.year,status:complete?'COMPLETE':'PARTIAL',sources:['PDDEINFO','SIGEF_EXTRATO'],summary:{schools:schoolResults.length,accounts:allAccounts.length,repassesPrevistosCents:pdde.payments.reduce((s,p)=>s+p.amountFinalDueCents,0),repassesPagosInformadosCents:pdde.payments.reduce((s,p)=>s+p.amountPaidCents,0),creditosFndeLocalizadosCents:summaryTotals.REPASSE_FNDE,aplicacoesFinanceirasCents:summaryTotals.APLICACAO_FINANCEIRA,resgatesCents:summaryTotals.RESGATE_APLICACAO,pagamentosTransferenciasCents:summaryTotals.PAGAMENTO_TRANSFERENCIA+summaryTotals.PAGAMENTO_CARTAO,rendimentosCents:summaryTotals.RENDIMENTO_FINANCEIRO,entradasTerceirosCents:summaryTotals.ENTRADA_TERCEIRO,tarifasCents:summaryTotals.TARIFA_BANCARIA,estornosCents:summaryTotals.ESTORNO_REVERSAO,naoClassificadosCents:summaryTotals.MOVIMENTO_NAO_CLASSIFICADO,saldosPddeInfoCents:balances,movimentosHistoricosExtraidos:historical,movimentosDoExercicio:movementsInYear},schools:schoolResults};
  await mkdir(dirname(opt.output),{recursive:true});await writeFile(opt.output,`${JSON.stringify(result,null,2)}\n`,'utf8');process.stdout.write(`${JSON.stringify({status:result.status,output:opt.output,summary:result.summary},null,2)}\n`);if(result.status!=='COMPLETE')process.exitCode=2;
}
const direct=process.argv[1]?import.meta.url===pathToFileURL(resolve(process.argv[1])).href:false;if(direct)main().catch(e=>{process.stderr.write(`Falha no monitoramento live: ${e instanceof Error?e.message:String(e)}\n`);process.exitCode=1;});
