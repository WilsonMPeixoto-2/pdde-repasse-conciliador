import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

describe('nova consulta financeira em tempo real', () => {
  test('expõe o botão Fazer nova consulta sem pedir senha ao operador', async () => {
    const page = await readFile(new URL('../../src/product/pages/PortfolioPage.tsx', import.meta.url), 'utf8');

    expect(page).toContain('Fazer nova consulta');
    expect(page).toContain('Baixar planilha Excel');
    expect(page).toContain('state.downloadWorkbook()');
    expect(page).not.toMatch(/Chave de acesso|type="password"/i);
  });

  test('usa endpoint próprio de consulta ao vivo sem depender de segredo no navegador', async () => {
    const api = await readFile(new URL('../../src/product/api.ts', import.meta.url), 'utf8');
    const liveSource = await readFile(new URL('../../server/live-source.ts', import.meta.url), 'utf8');

    expect(api).toContain('/api/live');
    expect(liveSource).not.toMatch(/PDDE_SESSION_ACCESS_KEY|authorization:\s*`Bearer \$\{accessKey\}`/i);
  });

  test('empacota o catálogo das 163 UEs em vez de depender de arquivo no filesystem da Function', async () => {
    const liveSource = await readFile(new URL('../../server/live-source.ts', import.meta.url), 'utf8');

    expect(liveSource).toContain("../backend/schools4cre.json");
    expect(liveSource).not.toContain('loadMasterSchools');
  });

  test('não carrega a pilha de navegador quando a consulta usa apenas HTTP', async () => {
    const reports = await readFile(
      new URL('../../backend/adapters/pddeinfo-public-reports.ts', import.meta.url),
      'utf8',
    );

    expect(reports).not.toMatch(/import\s*\{[^}]*collectWithAssistedBrowser[^}]*\}\s*from\s*['"]\.\/browser-assisted-source['"]/s);
    expect(reports).toContain("await import('./browser-assisted-source')");
  });

  test('empacota o backend da função antes do deploy e respeita o teto Hobby de 300 segundos', async () => {
    const wrapper = await readFile(new URL('../../api/live.js', import.meta.url), 'utf8');
    const liveConfig = await readFile(new URL('../../vite.live.config.ts', import.meta.url), 'utf8');
    const packageJson = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8')) as {
      scripts?: Record<string, string>;
    };

    expect(wrapper).toContain("../server-dist/live-source.js");
    expect(wrapper).toMatch(/maxDuration:\s*300/);
    expect(packageJson.scripts?.build).toContain('vite build --config vite.live.config.ts');
    expect(liveConfig).toContain('server/live-source.ts');
    expect(liveConfig).toContain('server-dist');
  });

  test('protege a exportação contra refresh concorrente e revoga o blob somente após o clique', async () => {
    const context = await readFile(new URL('../../src/product/PortfolioContext.tsx', import.meta.url), 'utf8');
    const workbook = await readFile(new URL('../../src/product/export-workbook.ts', import.meta.url), 'utf8');

    expect(context).toContain("if (refreshing || exportingWorkbook || state.status !== 'ready') return;");
    expect(workbook).toContain('window.setTimeout(() => URL.revokeObjectURL(url), 0)');
  });

});
