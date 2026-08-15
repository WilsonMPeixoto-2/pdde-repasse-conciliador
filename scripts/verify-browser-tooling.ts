import { createServer } from 'node:http';
import { once } from 'node:events';
import { collectWithAssistedBrowser } from '../backend/adapters/browser-assisted-source';
import { renderHtmlPdf } from '../backend/report/html-pdf-renderer';

async function listenLocal(): Promise<{ url: string; close(): Promise<void> }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end('<!doctype html><html><body><main id="pdde-browser-verification">PDDE browser verification</main></body></html>');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor local de verificação não obteve porta TCP.');
  return {
    url: `http://127.0.0.1:${address.port}/`,
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
}

async function main(): Promise<void> {
  const local = await listenLocal();
  try {
    const collected = await collectWithAssistedBrowser({
      url: local.url,
      interactive: false,
      timeoutMs: 30_000,
    });
    if (!collected.html.includes('pdde-browser-verification')) {
      throw new Error('Crawlee/Playwright não recuperou o marcador esperado da página local.');
    }

    const pdf = await renderHtmlPdf({
      html: '<!doctype html><html><body><h1>PDDE PDF verification</h1></body></html>',
    });
    const signature = Buffer.from(pdf.slice(0, 5)).toString('ascii');
    if (signature !== '%PDF-') throw new Error(`Playwright não gerou PDF válido; assinatura recebida: ${signature}.`);

    process.stdout.write(`Browser assistido validado em ${collected.sourceUrl}; PDF=${pdf.byteLength} bytes.\n`);
  } finally {
    await local.close();
  }
}

main().catch((cause) => {
  const message = cause instanceof Error ? cause.stack ?? cause.message : String(cause);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
