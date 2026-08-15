const ORIGIN = 'https://www.fnde.gov.br';
const paths = [
  '/plataforma-antonieta-de-barros/dados/produtos-de-dados',
  '/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar/8',
  '/plataforma-antonieta-de-barros/programas-e-acoes/programas/visualizar/4',
];

const unique = <T>(values: T[]) => [...new Set(values)];

for (const path of paths) {
  const url = ORIGIN + path;
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 PDDE-4CRE-Probe/1.0' } });
  const html = await response.text();
  console.log('\nPAGE', JSON.stringify({ url, status: response.status, finalUrl: response.url, bytes: html.length }));
  const scripts = unique([...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => new URL(m[1], response.url).toString()));
  const links = unique([...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi)].map((m) => m[1]));
  console.log('SCRIPTS', scripts);
  console.log('INTERESTING_LINKS', links.filter((v) => /zip|artef|produto|api|export|download|bbagil|pdde/i.test(v)).slice(0, 100));

  for (const script of scripts.slice(0, 30)) {
    if (!script.startsWith(ORIGIN)) continue;
    const sr = await fetch(script, { headers: { 'User-Agent': 'Mozilla/5.0 PDDE-4CRE-Probe/1.0' } });
    const js = await sr.text();
    const hits: string[] = [];
    for (const needle of ['artefato', 'produtos-de-dados', 'produtoDeDados', 'ETI_BBAGIL', '/api/', 'download', 'exportar']) {
      let pos = 0;
      while ((pos = js.indexOf(needle, pos)) >= 0 && hits.length < 30) {
        hits.push(js.slice(Math.max(0, pos - 180), Math.min(js.length, pos + 420)).replace(/\s+/g, ' '));
        pos += needle.length;
      }
    }
    const apiPaths = unique([...js.matchAll(/["'`](\/?(?:api|dados|produtos|artefatos|arquivos|exports)[^"'`\\ ]{2,180})["'`]/gi)].map((m) => m[1]));
    if (hits.length || apiPaths.length) {
      console.log('\nSCRIPT_HITS', script, 'bytes', js.length);
      console.log('API_PATHS', apiPaths.slice(0, 100));
      console.log('CONTEXTS', unique(hits).slice(0, 20));
    }
  }
}
