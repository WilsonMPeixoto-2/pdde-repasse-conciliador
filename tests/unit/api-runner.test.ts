import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { runApiServer } from '../../scripts/api';

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(async (server) => {
    server.closeAllConnections();
    if (!server.listening) return;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }));
});

function serverAddress(server: Server): string {
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Servidor sem porta TCP.');
  return `http://127.0.0.1:${address.port}`;
}

describe('processo da API institucional', () => {
  test('fecha o listener quando recebe sinal de encerramento', async () => {
    const server = createServer((_request, response) => response.end('ok'));
    servers.push(server);
    const shutdown = new AbortController();
    const listening = vi.fn();
    const pending = runApiServer(server, {
      host: '127.0.0.1',
      port: 0,
      signal: shutdown.signal,
      onListening: listening,
    });

    await vi.waitFor(() => expect(listening).toHaveBeenCalledOnce());
    expect(server.listening).toBe(true);
    shutdown.abort();

    await expect(pending).resolves.toBeUndefined();
    expect(server.listening).toBe(false);
  });

  test('aguarda a resposta ativa antes de encerrar graciosamente', async () => {
    let finish: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const server = createServer(async (_request, response) => {
      markStarted?.();
      await new Promise<void>((resolve) => { finish = resolve; });
      response.end('concluído');
    });
    servers.push(server);
    const shutdown = new AbortController();
    const pending = runApiServer(server, {
      host: '127.0.0.1', port: 0, signal: shutdown.signal,
    });

    await vi.waitFor(() => expect(server.listening).toBe(true));
    const responsePending = fetch(serverAddress(server));
    await started;
    shutdown.abort();
    let lifecycleFinished = false;
    void pending.then(() => { lifecycleFinished = true; });
    await Promise.resolve();
    expect(lifecycleFinished).toBe(false);

    finish?.();
    await expect(responsePending.then((response) => response.text())).resolves.toBe('concluído');
    await expect(pending).resolves.toBeUndefined();
  });

  test('propaga erro do listener ocorrido depois do startup', async () => {
    const server = createServer();
    servers.push(server);
    const shutdown = new AbortController();
    const listening = vi.fn();
    const pending = runApiServer(server, {
      host: '127.0.0.1', port: 0, signal: shutdown.signal, onListening: listening,
    });

    await vi.waitFor(() => expect(listening).toHaveBeenCalledOnce());
    server.emit('error', new Error('listener indisponível'));

    await expect(pending).rejects.toThrow('listener indisponível');
    expect(server.listening).toBe(false);
  });

  test('encerra conexões ativas que ultrapassam o prazo gracioso', async () => {
    let markStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const server = createServer(async () => {
      markStarted?.();
      await new Promise<void>(() => undefined);
    });
    servers.push(server);
    const shutdown = new AbortController();
    const pending = runApiServer(server, {
      host: '127.0.0.1',
      port: 0,
      signal: shutdown.signal,
      shutdownTimeoutMs: 50,
    });

    await vi.waitFor(() => expect(server.listening).toBe(true));
    const response = fetch(serverAddress(server)).then(
      () => null,
      (cause: unknown) => cause,
    );
    await started;
    shutdown.abort();

    await expect(pending).resolves.toBeUndefined();
    expect(server.listening).toBe(false);
    await expect(response).resolves.toBeInstanceOf(Error);
  });
});
