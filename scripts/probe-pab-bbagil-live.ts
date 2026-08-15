const bases=[
  'https://www.fnde.gov.br/plataforma-antonieta-de-barros-api',
  'https://www.fnde.gov.br/plataforma-antonieta-de-barros-api/api',
];
const paths=[
  '/payment/agile/programs?page=1&size=20',
  '/payment/agile/all?cnpj=01959159000109&program__in=PDDE%20QUALIDADE&page=1&size=20&release_date__gte=2026-01-01&release_date__lte=2026-08-15',
  '/payment/agile/all?cnpj=01959159000109&page=1&size=20&release_date__gte=2026-01-01&release_date__lte=2026-08-15',
  '/payment/agile/entity_types?page=1&size=20',
  '/payment/agile/categories?page=1&size=20',
  '/payment/agile/descriptions?page=1&size=20',
];
for(const base of bases){
  for(const path of paths){
    const url=base+path;
    try{
      const r=await fetch(url,{redirect:'manual',headers:{Accept:'application/json','User-Agent':'PDDE-4CRE-Probe/1.0'}});
      const text=await r.text();
      console.log('RESULT',JSON.stringify({url,status:r.status,type:r.headers.get('content-type'),wwwAuthenticate:r.headers.get('www-authenticate'),location:r.headers.get('location'),allow:r.headers.get('allow'),bytes:text.length,body:text.slice(0,2500)}));
    }catch(e){console.log('ERROR',url,String(e));}
  }
}
