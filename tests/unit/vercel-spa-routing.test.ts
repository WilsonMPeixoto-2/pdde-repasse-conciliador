import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('roteamento SPA na Vercel', () => {
  test('reescreve somente rotas do frontend para index.html e preserva /api', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      rewrites?: Array<{ source: string; destination: string }>;
    };
    const rewrites = config.rewrites ?? [];

    expect(rewrites).toEqual(expect.arrayContaining([
      { source: '/unidades', destination: '/index.html' },
      { source: '/unidades/:path*', destination: '/index.html' },
      { source: '/repasses', destination: '/index.html' },
      { source: '/pdde-basico', destination: '/index.html' },
      { source: '/saldos', destination: '/index.html' },
      { source: '/indicadores/:path*', destination: '/index.html' },
    ]));
    expect(rewrites.some((item) => item.source.includes('api'))).toBe(false);
    expect(rewrites.some((item) => item.source === '/(.*)')).toBe(false);
  });
});
