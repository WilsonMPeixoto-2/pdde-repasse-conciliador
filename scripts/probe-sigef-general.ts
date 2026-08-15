import { load } from 'cheerio';
const url='https://www.fnde.gov.br/sigefweb/index.php/extratos';
const headers={'User-Agent':'Mozilla/5.0 PDDE-4CRE-Probe/1.0','Accept-Language':'pt-BR,pt;q=0.9'};
const r=await fetch(url,{headers});
const html=await r.text();
console.log('ROOT',JSON.stringify({status:r.status,finalUrl:r.url,bytes:html.length,setCookie:r.headers.get('set-cookie')}));
const $=load(html);
for(const [i,form] of $('form').toArray().entries()){
  const f=$(form);
  console.log('FORM',i,JSON.stringify({action:f.attr('action'),method:f.attr('method'),id:f.attr('id'),name:f.attr('name')}));
  for(const el of f.find('input,select,button').toArray()){
    const e=$(el); const tag=(el as any).tagName;
    console.log('FIELD',JSON.stringify({tag,name:e.attr('name'),id:e.attr('id'),type:e.attr('type'),value:e.attr('value'),text:e.text().trim(),options:tag==='select'?e.find('option').toArray().map(o=>({value:$(o).attr('value'),text:$(o).text().trim()})).slice(0,120):undefined}));
  }
}
for(const [i,script] of $('script:not([src])').toArray().entries()){
  const text=$(script).html()||'';
  if(/ano|programa|ajax|extrato|mes_ini|mes_fim/i.test(text)) console.log('INLINE_SCRIPT',i,text.replace(/\s+/g,' ').slice(0,12000));
}
for(const [i,el] of $('[onchange],[onclick],[onsubmit]').toArray().entries()){
  const e=$(el);
  console.log('INLINE_HANDLER',i,JSON.stringify({tag:(el as any).tagName,id:e.attr('id'),name:e.attr('name'),onchange:e.attr('onchange'),onclick:e.attr('onclick'),onsubmit:e.attr('onsubmit')}));
}

const cookie=(r.headers.get('set-cookie')||'').split(';')[0];
async function post(body: Record<string,string>){
  const pr=await fetch(url,{method:'POST',redirect:'follow',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded','Referer':url,...cookie&&{'Cookie':cookie}},body:new URLSearchParams(body)});
  const text=await pr.text();
  const p$=load(text); const plain=p$.root().text().replace(/\s+/g,' ').trim();
  const dates=[...new Set([...text.matchAll(/\b\d{2}\/\d{2}\/2026\b/g)].map(m=>m[0]))];
  const links=p$('a[href]').toArray().map(a=>p$(a).attr('href')||'').filter(v=>/extrato|conta|download|gerar/i.test(v));
  console.log('POST_RESULT',JSON.stringify({body,status:pr.status,finalUrl:pr.url,bytes:text.length,title:p$('title').text(),dates:dates.slice(-40),dateCount:dates.length,links:links.slice(0,100),hasCaptcha:/captcha/i.test(text),plain:plain.slice(0,2500)}));
  const prog=p$('#programa option').toArray().map(o=>({value:p$(o).attr('value'),text:p$(o).text().trim()}));
  console.log('POST_PROGRAM_OPTIONS',body,prog.slice(0,200));
}
await post({ano:'2026'});
await post({ano:'2026',programa:'0B',mes_ini:'01',mes_fim:'08',confirmar:'Confirmar'});
await post({ano:'2026',programa:'02',mes_ini:'01',mes_fim:'08',confirmar:'Confirmar'});
