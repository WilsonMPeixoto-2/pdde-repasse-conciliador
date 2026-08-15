const ORIGIN='https://www.fnde.gov.br/plataforma-antonieta-de-barros/';
const asset='assets/AgileBBListPage-BVChru9i.js';
const src=await (await fetch(new URL(asset,ORIGIN))).text();
console.log('PAGE_BYTES',src.length);
console.log('IMPORT_HEAD',src.slice(0,9000));
const imports=[...new Set([...src.matchAll(/from["']\.\/(.+?\.js)["']/g)].map(m=>'assets/'+m[1]))];
console.log('IMPORTS',imports);
const needles=['checkingAccount','checking-account','bbAgil','bb-agil','paymentStatement','payment-statement','bankStatement','bank-statement','beneficiaryDocument','beneficiary_document','creditDebit','credit_debit','export','xlsx','releaseDate','release_date','category','subCategory','sub_category','cnpj'];
for(const imp of imports){
  try{
    const u=new URL(imp,ORIGIN).toString();
    const r=await fetch(u);
    const js=await r.text();
    const lower=js.toLowerCase();
    if(!needles.some(n=>lower.includes(n.toLowerCase()))) continue;
    console.log('\n=== IMPORT_MATCH',imp,'BYTES',js.length,'===');
    for(const n of needles){
      let p=0,c=0;
      while((p=lower.indexOf(n.toLowerCase(),p))>=0 && c++<20){
        console.log('CTX',n,js.slice(Math.max(0,p-650),Math.min(js.length,p+1800)).replace(/\s+/g,' '));
        p+=n.length;
      }
    }
    const strings=[...new Set([...js.matchAll(/["'`](.{1,180}?)["'`]/g)].map(m=>m[1]).filter(s=>/bb|agil|extrat|moviment|bank|account|benef|export|program|entity/i.test(s)))];
    console.log('STRINGS',strings.slice(0,200));
  }catch(e){console.log('ERR',imp,String(e));}
}
