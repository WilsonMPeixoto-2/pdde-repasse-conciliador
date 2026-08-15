import { writeFile } from 'node:fs/promises';

const OPENAPI = 'https://api.portaldatransparencia.gov.br/v3/api-docs';
const TARGET_PATHS = [
  '/api-de-dados/despesas/documentos-por-favorecido',
  '/api-de-dados/despesas/recursos-recebidos',
  '/api-de-dados/despesas/documentos',
  '/api-de-dados/despesas/documentos-relacionados',
];

const response = await fetch(OPENAPI, { headers: { Accept: 'application/json' } });
if (!response.ok) throw new Error(`OpenAPI do Portal retornou HTTP ${response.status}.`);
const document = await response.json() as { info?: unknown; paths?: Record<string, unknown> };
const paths = Object.fromEntries(TARGET_PATHS.map((path) => [path, document.paths?.[path] ?? null]));
const result = { fetchedAt: new Date().toISOString(), openapi: OPENAPI, info: document.info ?? null, paths };
const target = process.argv[2] ?? 'portal-openapi-probe.json';
await writeFile(target, JSON.stringify(result, null, 2), 'utf8');
console.log(`probe escrito em ${target}`);
