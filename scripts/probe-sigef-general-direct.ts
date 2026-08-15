const base='https://www.fnde.gov.br/sigefweb/index.php';
const headers={'User-Agent':'Mozilla/5.0 PDDE-4CRE-Probe/1.0','Accept-Language':'pt-BR,pt;q=0.9'};
async function req(url:string, init:RequestInit={}){
  const r=await fetch(url,{...init,redirect:'manual',headers:{...headers,...(init.headers||{})}});
  const buf=Buffer.from(await r.arrayBuffer());
  const text=new TextDecoder('windows-1252').decode(buf);
  console.log('RESP',JSON.stringify({url,status:r.status,type:r.headers.get('content-type'),location:r.headers.get('location'),bytes:buf.length,hasCaptcha:/captcha/i.test(text),body:text.slice(0,3000)}));
  return {r,text};
}
const ajax=await req(`${base}/extratos/ajax/ano/2026`,{method:'POST',headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'}});
let programs:any[]=[];
try{programs=JSON.parse(ajax.text);console.log('PROGRAMS',JSON.stringify(programs));}catch{}
const selected=programs.filter(p=>/PDDE|QUALIDADE|EQUIDADE/i.test(String(p.NOME||p.name||'')));
console.log('SELECTED',JSON.stringify(selected));
for(const p of selected.slice(0,8)){
  const id=String(p.ID??p.id??'');
  if(!id) continue;
  await req(`${base}/extratos/gerar-extrato-bancario/ano/2026/programa/${encodeURIComponent(id)}/mes_ini/01/mes_fim/08`,{method:'GET',headers:{Accept:'text/html,application/octet-stream,*/*'}});
}
