const ORIGIN = 'https://www.fnde.gov.br/plataforma-antonieta-de-barros/';
const mainUrl = new URL('assets/index-Dy0c8hD4.js', ORIGIN).toString();
const main = await (await fetch(mainUrl, { headers: { 'User-Agent': 'Mozilla/5.0 PDDE-4CRE-Probe/1.0' } })).text();
const assets = [...new Set([...main.matchAll(/assets\/[A-Za-z0-9_.-]+\.js/g)].map((m) => m[0]))];
console.log('ASSET_COUNT', assets.length);
console.log('ASSET_NAMES', assets);

const needles = ['artefato','produto-de-dados','produtos-de-dados','download','exportar','api/','baseURL','baseUrl','ETI_BBAGIL','palavra-chave','programa'];
const urlRegex = /https?:\\?\/\\?\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%\\-]+/g;
const pathRegex = /["'`](\/[A-Za-z0-9._~:/?#[\]@!$&()*+,;=%-]{4,220})["'`]/g;

for (const asset of assets.slice(0, 120)) {
  const url = new URL(asset, ORIGIN).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 PDDE-4CRE-Probe/1.0' } });
    const js = await res.text();
    const lower = js.toLowerCase();
    if (!needles.some((n) => lower.includes(n.toLowerCase()))) continue;
    const contexts: string[] = [];
    for (const needle of needles) {
      let pos = 0;
      while ((pos = lower.indexOf(needle.toLowerCase(), pos)) >= 0 && contexts.length < 40) {
        contexts.push(js.slice(Math.max(0, pos - 260), Math.min(js.length, pos + 650)).replace(/\s+/g, ' '));
        pos += needle.length;
      }
    }
    const urls = [...new Set(js.match(urlRegex) ?? [])];
    const paths = [...new Set([...js.matchAll(pathRegex)].map((m) => m[1]))]
      .filter((v) => /api|produto|artef|download|export|arquivo|programa|dados/i.test(v));
    console.log('\n=== ASSET', asset, 'STATUS', res.status, 'BYTES', js.length, '===');
    console.log('URLS', urls.slice(0, 100));
    console.log('PATHS', paths.slice(0, 120));
    console.log('CONTEXTS', [...new Set(contexts)].slice(0, 25));
  } catch (error) {
    console.log('ASSET_ERROR', asset, String(error));
  } finally {
    clearTimeout(timeout);
  }
}
