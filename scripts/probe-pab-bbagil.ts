const ORIGIN = 'https://www.fnde.gov.br/plataforma-antonieta-de-barros/';
const API = 'https://www.fnde.gov.br/plataforma-antonieta-de-barros-api';
const mainUrl = new URL('assets/index-Dy0c8hD4.js', ORIGIN).toString();
const main = await (await fetch(mainUrl)).text();
for (const needle of ['bbAgil','BB Gestão Ágil','GESTOR_BB_AGIL','bb-agil']) {
  let p = 0;
  while ((p = main.indexOf(needle, p)) >= 0) {
    console.log('MAIN_CONTEXT', needle, main.slice(Math.max(0,p-500), Math.min(main.length,p+1200)).replace(/\s+/g,' '));
    p += needle.length;
  }
}
const assets = [...new Set([...main.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)].map(m=>m[0]))];
for (const asset of assets) {
  const url = new URL(asset, ORIGIN).toString();
  try {
    const r = await fetch(url);
    const js = await r.text();
    if (!/(BB Gest[aã]o [ÁA]gil|GESTOR_BB_AGIL|bbAgil|bb-agil|extratos? banc[aá]ri|movimenta[cç][oõ]es banc[aá]rias)/i.test(js)) continue;
    console.log('\nMATCH_ASSET', asset, 'bytes', js.length);
    for (const needle of ['BB Gestão Ágil','GESTOR_BB_AGIL','bbAgil','bb-agil','extrato','movement','moviment']) {
      let p = 0, count = 0;
      const low = js.toLowerCase();
      const n = needle.toLowerCase();
      while ((p = low.indexOf(n,p)) >= 0 && count++ < 30) {
        console.log('CTX', needle, js.slice(Math.max(0,p-450),Math.min(js.length,p+1400)).replace(/\s+/g,' '));
        p += n.length;
      }
    }
  } catch (e) { console.log('ERR_ASSET', asset, String(e)); }
}

const guesses = [
  '/bb-agil','/bb-agil/','/extratos','/bank-statements','/transactions','/movements',
  '/programs/bb-agil','/program-actions/bb-agil','/bb-agil/count'
];
for (const p of guesses) {
  try {
    const r=await fetch(API+p,{headers:{Accept:'application/json','User-Agent':'PDDE-4CRE-Probe/1.0'}});
    const text=await r.text();
    console.log('API_GUESS', JSON.stringify({p,status:r.status,type:r.headers.get('content-type'),location:r.headers.get('location'),body:text.slice(0,600)}));
  } catch(e){ console.log('API_GUESS_ERR',p,String(e)); }
}
