import { once } from 'node:events';
import { request as nodeRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, test } from 'vitest';
import { createNodeApiServer } from '../../backend/runtime/node-api-server';

const servers: ReturnType<typeof createNodeApiServer>[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(async (server) => {
    if (!server.listening) return;
    server.close();
    await once(server, 'close');
  }));
});

async function listen(handler: (request: Request) => Promise<Response>, maxBodyBytes = 1_000_000) {
  const server = createNodeApiServer(handler, { maxBodyBytes });
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  return `http://127.0.0.1:${port}`;
}

describe('adaptador HTTP Node', () => {
  test('converte método, rota, headers e JSON para Web Request/Response', async () => {
    const base = await listen(async (request) => new Response(JSON.stringify({
      method: request.method,
      pathname: new URL(request.url).pathname,
      authorization: request.headers.get('authorization'),
      body: await request.json(),
    }), { status: 202, headers: { 'content-type': 'application/json', 'x-test': 'ok' } }));

    const response = await fetch(`${base}/api/executions/pddeinfo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer token' },
      body: JSON.stringify({ fiscalYear: 2026 }),
    });
    expect(response.status).toBe(202);
    expect(response.headers.get('x-test')).toBe('ok');
    expect(await response.json()).toEqual({
      method: 'POST', pathname: '/api/executions/pddeinfo',
      authorization: 'Bearer token', body: { fiscalYear: 2026 },
    });
  });

  test('bloqueia corpo em streaming acima do limite antes do handler', async () => {
    let called = false;
    const base = await listen(async () => {
      called = true;
      return new Response('não deveria executar');
    }, 16);
    const response = await fetch(`${base}/api/reconciliations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: 'x'.repeat(100) }),
    });
    expect(response.status).toBe(413);
    expect(called).toBe(false);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/1|limite|grande/i) });
  });

  test('responde 413 assim que stream chunked excede o limite, sem aguardar o cliente encerrar', async () => {
    let called = false;
    const base = await listen(async () => {
      called = true;
      return new Response('não deveria executar');
    }, 16);
    let resolveResponse!: (value: { status: number; body: string }) => void;
    const responsePromise = new Promise<{ status: number; body: string }>((resolve) => {
      resolveResponse = resolve;
    });
    const client = nodeRequest(`${base}/api/reconciliations`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolveResponse({
        status: response.statusCode ?? 0,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    client.write('x'.repeat(17));

    const prompt = await Promise.race([
      responsePromise.then(() => true),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 500)),
    ]);
    if (!prompt) client.end();
    const response = await responsePromise;
    client.destroy();

    expect(prompt).toBe(true);
    expect(response.status).toBe(413);
    expect(JSON.parse(response.body)).toMatchObject({ error: expect.stringMatching(/limite|1 mb/i) });
    expect(called).toBe(false);
  });
});
