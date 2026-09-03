import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('frescor das fontes públicas', () => {
  test('clientes HTTP pedem conteúdo fresco ao PDDEInfo, SIGEF e Portal', () => {
    for (const path of [
      'backend/adapters/pddeinfo-http.ts',
      'backend/adapters/pddeinfo-public-reports.ts',
      'backend/adapters/sigef-public-statement.ts',
      'backend/adapters/sigef-public-releases.ts',
      'backend/adapters/portal-transparencia-http.ts',
    ]) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).toContain("'Cache-Control': 'no-cache, no-store, max-age=0'");
      expect(source, path).toContain("Pragma: 'no-cache'");
    }
  });
});
