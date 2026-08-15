import { load } from 'cheerio';
const start='https://www.bb.com.br/site/setor-publico/bb-gestao-agil/';
const headers={'User-Agent':'Mozilla/5.0 PDDE-4CRE-Probe/1.0','Accept-Language':'pt-BR,pt;q=0.9'};
const r=await fetch(start,{redirect:'follow',headers});
const html=await r.text();
console.log('PAGE',JSON.stringify({status:r.status,finalUrl:r.url,bytes:html.length}));
const $=load(html);
const links=$('a[href]').toArray().map(a=>({text:$(a).text().replace(/\s+/g,' ').trim(),href:new URL($(a).attr('href')!,r.url).toString()}));
console.log('LINKS',JSON.stringify(links.filter(x=>/extrato|gest[aã]o|agil|transpar/i.test(x.text+' '+x.href)),null,2));
const rawMatches=[...new Set([...html.matchAll(/https?:\/\/[^"'<>\s]+/g)].map(m=>m[0].replace(/&amp;/g,'&')))];
console.log('RAW_URLS',JSON.stringify(rawMatches.filter(x=>/extrato|agil|transpar/i.test(x)),null,2));
for(const link of links.filter(x=>/extrato/i.test(x.text+' '+x.href)).slice(0,10)){
  try{
    const rr=await fetch(link.href,{redirect:'follow',headers}); const text=await rr.text();
    console.log('FOLLOW',JSON.stringify({from:link, status:rr.status, finalUrl:rr.url, type:rr.headers.get('content-type'), bytes:text.length, title:load(text)('title').text(), body:text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,2500)}));
  }catch(e){console.log('FOLLOW_ERR',link,String(e));}
}
