import { describe, expect, test, vi } from 'vitest';
import {
  buildSigefBulkExtractUrl,
  buildSigefProgramsForYearUrl,
  parseSigefProgramsForYearJson,
  probeSigefPublicExtracts,
} from '../../backend/adapters/sigef-public-bulk-extracts';

describe('SIGEF Extratos > Consultas Gerais', () => {
  test('constrói a rota pública de programas do exercício 2026', () => {
    expect(buildSigefProgramsForYearUrl(2026)).toBe(
      'https://www.fnde.gov.br/sigefweb/index.php/extratos/ajax/ano/2026',
    );
  });

  test('reconhece o contrato real ID/NOME do índice público e ignora a opção sentinela', () => {
    const programs = parseSigefProgramsForYearJson(JSON.stringify([
      { ID: 'todos', NOME: 'Selecione um programa' },
      { ID: '0A', NOME: 'PDDE EQUIDADE', DS_PROGRAMA_FNDE: 'PDDE EQUIDADE' },
      { ID: '02', NOME: 'PDDE (PROGRAMA DINHEIRO DIRETO NA ESCOLA )', DS_PROGRAMA_FNDE: 'PDDE' },
    ]));
    expect(programs).toEqual([
      { value: '0A', label: 'PDDE EQUIDADE' },
      { value: '02', label: 'PDDE (PROGRAMA DINHEIRO DIRETO NA ESCOLA )' },
    ]);
  });

  test('mantém compatibilidade com o formato value/label já normalizado', () => {
    expect(parseSigefProgramsForYearJson(JSON.stringify([
      { value: '02', label: 'PROGRAMA DINHEIRO DIRETO NA ESCOLA' },
    ]))).toContainEqual({
      value: '02',
      label: 'PROGRAMA DINHEIRO DIRETO NA ESCOLA',
    });
  });

  test('constrói consulta pública por período sem fabricar parâmetros de escola ou conta', () => {
    expect(buildSigefBulkExtractUrl({
      year: 2026,
      programCode: '02',
      startMonth: 8,
      endMonth: 9,
    })).toBe(
      'https://www.fnde.gov.br/sigefweb/index.php/extratos/gerar-extrato-bancario/ano/2026/programa/02/mes_ini/08/mes_fim/09',
    );
  });

  test('probe confirma disponibilidade do índice público sem contornar CAPTCHA do gerador', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([
      { ID: 'todos', NOME: 'Selecione um programa' },
      { ID: '02', NOME: 'PDDE (PROGRAMA DINHEIRO DIRETO NA ESCOLA )', DS_PROGRAMA_FNDE: 'PDDE' },
    ]), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }));

    await expect(probeSigefPublicExtracts({ year: 2026, fetchImpl })).resolves.toMatchObject({
      status: 'AVAILABLE',
      supportsPdde: true,
      programCode: '02',
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  test('probe não transforma bloqueio ou conteúdo inesperado em fonte disponível', async () => {
    const fetchImpl = vi.fn(async () => new Response('<html>captcha</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    }));
    await expect(probeSigefPublicExtracts({ year: 2026, fetchImpl })).resolves.toMatchObject({
      status: 'UNAVAILABLE',
      supportsPdde: false,
    });
  });
});
