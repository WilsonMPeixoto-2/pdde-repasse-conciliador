import { load } from 'cheerio';
const url='https://www.fnde.gov.br/sigefweb/index.php/extratos';
const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 PDDE-4CRE-Probe/1.0'}});
const html=await r.text();
console.log('ROOT',JSON.stringify({status:r.status,finalUrl:r.url,bytes:html.length}));
const $=load(html);
for(const [i,form] of $('form').toArray().entries()){
  const f=$(form);
  console.log('FORM',i,JSON.stringify({action:f.attr('action'),method:f.attr('method'),id:f.attr('id'),name:f.attr('name')}));
  for(const el of f.find('input,select,button').toArray()){
    const e=$(el); const tag=(el as any).tagName;
    console.log('FIELD',JSON.stringify({tag,name:e.attr('name'),id:e.attr('id'),type:e.attr('type'),value:e.attr('value'),text:e.text().trim(),options:tag==='select'?e.find('option').toArray().map(o=>({value:$(o).attr('value'),text:$(o).text().trim()})).slice(0,80):undefined}));
  }
}
const scripts=[...new Set($('script[src]').toArray().map(s=>new URL($(s).attr('src')!,r.url).toString()))];
console.log('SCRIPTS',scripts);
for(const s of scripts){
  const js=await (await fetch(s)).text();
  if(/extrato|programa|mes_in|mes_f|ajax/i.test(js)){
    const hits=[] as string[];
    for(const n of ['extrato','programa','mes','ajax']){let p=0;while((p=js.toLowerCase().indexOf(n,p))>=0&&hits.length<30){hits.push(js.slice(Math.max(0,p-250),Math.min(js.length,p+800)).replace(/\s+/g,' '));p+=n.length;}}
    console.log('SCRIPT_MATCH',s,[...new Set(hits)]);
  }
}
