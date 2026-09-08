import { gzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { probeAntonietaDataProduct } from '../../backend/adapters/antonieta-data-product';

function mockFetch(compressed: Buffer): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/artifact-metadata')) {
      return new Response(JSON.stringify({
        size: compressed.length,
        name: 'PDDE_Prestacao_conta_SIGPC.txt.gz',
        lastUpdated: '2026-02-05T17:09:15Z',
        path: '',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/artifact')) {
      return new Response(Uint8Array.from(compressed).buffer, {
        status: 200,
        headers: { 'content-type': 'application/gzip' },
      });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

describe('cabeçalho temporal real do produto 59 da Antonieta', () => {
  test('reconhece an_exercicio como evidência temporal explícita sem inferir ano de outras colunas', async () => {
    const text = [
      'sg_uf;no_municipio;co_municipio_ibge;an_exercicio;co_escola;no_escola;tp_localizacao;qt_alunos;ST_ALUNADO;nu_cgc_entidade;no_razao_social;nu_ddd_entidade;nu_telefone;CNPJ_EEX;esfera;dt_atualizacao;nu_uex;st_atualizado',
      'RJ;RIO DE JANEIRO;3304557;2026;33069247;ESCOLA ALVO;1;500;2026;12345678000199;UEX;21;00000000;00000000000000;MUNICIPAL;2026-02-05;1;S',
      'RJ;RIO DE JANEIRO;3304557;2025;99999999;OUTRA ESCOLA;1;1900;2099;12345678000199;OUTRA;21;00000000;00000000000000;MUNICIPAL;2026-02-05;2;S',
    ].join('\n');
    const compressed = gzipSync(Buffer.from(text, 'utf8'));

    const probe = await probeAntonietaDataProduct({
      productId: 59,
      targetIneps: new Set(['33069247']),
      fetchImpl: mockFetch(compressed),
      maxSamples: 5,
    });

    expect(probe.yearColumnIndexes).toEqual([3]);
    expect(probe.years).toEqual({ '2025': 1, '2026': 1 });
    expect(probe.targetMatchCountsByYear).toEqual({ '2026:33069247': 1 });
    expect(probe.sample2026TargetRows).toHaveLength(1);
    expect(probe.sample2026TargetRows[0]?.[3]).toBe('2026');
    expect(probe.sample2026TargetRows[0]?.[4]).toBe('33069247');
  });
});
