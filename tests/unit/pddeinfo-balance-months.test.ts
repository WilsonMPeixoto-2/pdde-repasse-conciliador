import { describe, expect, it } from 'vitest';
import { discoverPddeInfoBalanceMonths } from '../../backend/adapters/pddeinfo-public-reports';

const html = `
<html><body>
  <select name="mes">
    <option value="">Selecione</option>
    <option value="06-2026">06-2026</option>
    <option value="05-2026">05-2026</option>
    <option value="12-2025">12-2025</option>
  </select>
</body></html>`;

describe('discoverPddeInfoBalanceMonths', () => {
  it('retorna somente meses de 2026 em ordem mais recente primeiro', async () => {
    const months = await discoverPddeInfoBalanceMonths({
      fetchImpl: async () => new Response(html, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      }),
    });
    expect(months).toEqual(['06-2026', '05-2026']);
  });

  it('não inventa cobertura quando o formulário não publica meses de 2026', async () => {
    const months = await discoverPddeInfoBalanceMonths({
      fetchImpl: async () => new Response('<select name="mes"><option value="12-2025">12-2025</option></select>', {
        status: 200,
      }),
    });
    expect(months).toEqual([]);
  });
});
