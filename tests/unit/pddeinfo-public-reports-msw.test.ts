import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { fetchPddeInfoPublicReport } from '../../backend/adapters/pddeinfo-public-reports';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('MSW intercepta a consulta HTTP real sem injeção de fetch', async () => {
  server.use(
    http.get(
      'https://www.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade',
      () => HttpResponse.text(
        '<table><tr><th>Conta</th><th>Saldo</th></tr><tr><td>12345</td><td>10,00</td></tr></table>',
        { headers: { 'content-type': 'text/html; charset=utf-8' } },
      ),
    ),
  );

  const result = await fetchPddeInfoPublicReport({
    filter: {
      kind: 'BALANCE',
      month: '07-2026',
      cnpj: '12345678000190',
    },
    browserFallback: false,
  });

  expect(result.via).toBe('HTTP');
  expect(result.rows).toEqual([{ Conta: '12345', Saldo: '10,00' }]);
  expect(result.coverageThrough).toBe('2026-07-31');
});
