import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { z } from 'zod';
import {
  MAX_INSTITUTIONAL_JSON_BODY_BYTES,
  type InstitutionalApiHandler,
} from '../api/institutional-api';

class BodyTooLargeError extends Error {}

function bodyTooLarge(maxBodyBytes: number): BodyTooLargeError {
  return new BodyTooLargeError(
    `Corpo da requisição excede o limite de ${maxBodyBytes} bytes.`,
  );
}

interface NodeApiServerOptions {
  maxBodyBytes?: number;
  onError?: (cause: unknown) => void;
}

function requestHeaders(message: IncomingMessage): Headers {
  const headers = new Headers();
  for (let index = 0; index < message.rawHeaders.length; index += 2) {
    headers.append(message.rawHeaders[index], message.rawHeaders[index + 1]);
  }
  return headers;
}

async function requestBody(message: IncomingMessage, maxBodyBytes: number): Promise<string> {
  const declared = Number(message.headers['content-length'] ?? 0);
  if (Number.isFinite(declared) && declared > maxBodyBytes) {
    message.resume();
    throw bodyTooLarge(maxBodyBytes);
  }

  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const rawChunk of message.iterator({ destroyOnReturn: false })) {
    const chunk = Buffer.isBuffer(rawChunk) ? rawChunk : Buffer.from(rawChunk);
    bytes += chunk.byteLength;
    if (bytes > maxBodyBytes) {
      message.resume();
      throw bodyTooLarge(maxBodyBytes);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes).toString('utf8');
}

async function toWebRequest(message: IncomingMessage, maxBodyBytes: number): Promise<Request> {
  const method = message.method ?? 'GET';
  const host = message.headers.host ?? 'localhost';
  const url = new URL(message.url ?? '/', `http://${host}`);
  const hasBody = method !== 'GET' && method !== 'HEAD';
  const body = hasBody ? await requestBody(message, maxBodyBytes) : undefined;
  return new Request(url, {
    method,
    headers: requestHeaders(message),
    ...(body ? { body } : {}),
  });
}

async function writeWebResponse(response: Response, output: ServerResponse): Promise<void> {
  output.statusCode = response.status;
  response.headers.forEach((value, name) => output.setHeader(name, value));
  const bytes = new Uint8Array(await response.arrayBuffer());
  output.end(bytes);
}

function writeError(output: ServerResponse, status: number, error: string): void {
  const body = Buffer.from(JSON.stringify({ error }), 'utf8');
  output.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': body.byteLength,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  output.end(body);
}

export function createNodeApiServer(
  handler: InstitutionalApiHandler,
  options: NodeApiServerOptions = {},
): Server {
  const maxBodyBytes = z.number().int().min(1).max(10_000_000)
    .parse(options.maxBodyBytes ?? MAX_INSTITUTIONAL_JSON_BODY_BYTES);
  return createServer(async (input, output) => {
    try {
      await writeWebResponse(await handler(await toWebRequest(input, maxBodyBytes)), output);
    } catch (cause) {
      options.onError?.(cause);
      if (cause instanceof BodyTooLargeError) {
        writeError(output, 413, cause.message);
        return;
      }
      writeError(output, 500, 'Erro interno no adaptador HTTP.');
    }
  });
}
