import { describe, expect, test } from 'vitest';
import {
  evidenceStorePathFromArguments,
  optionsFromArguments,
  parseArguments,
} from '../../scripts/reconcile';

const requiredArguments = [
  '--pdde-info', '/dados/pddeinfo.json',
  '--movements', '/dados/movements.csv',
  '--output', '/dados/result.xlsx',
  '--year', '2026',
  '--requested-through', '2026-08-12',
];

describe('argumentos do conciliador', () => {
  test('converte a pasta e a URL de Liberações para o contrato da aplicação', () => {
    const options = optionsFromArguments(parseArguments([
      ...requiredArguments,
      '--releases-dir', '/dados/liberacoes',
      '--releases-source-url', 'https://www.fnde.gov.br/sigefweb/index.php/liberacoes',
      '--overwrite',
    ]));

    expect(options).toMatchObject({
      releaseDirectoryPath: '/dados/liberacoes',
      releaseDirectorySourceUrl: 'https://www.fnde.gov.br/sigefweb/index.php/liberacoes',
      overwrite: true,
    });
  });

  test('infere o evidence store do layout padrão do coletor', () => {
    const parsed = parseArguments([
      '--pdde-info', '/workspace/runs/run-001/pddeinfo-2026.json',
      '--movements', '/dados/movements.csv',
      '--output', '/dados/result.xlsx',
      '--year', '2026',
      '--requested-through', '2026-08-12',
    ]);
    expect(evidenceStorePathFromArguments(parsed)).toBe('/workspace/evidence/events.jsonl');
  });

  test('aceita evidence store explícito para entradas fora do layout padrão', () => {
    const parsed = parseArguments([
      ...requiredArguments,
      '--evidence-store', '/auditoria/pdde-events.jsonl',
    ]);
    expect(evidenceStorePathFromArguments(parsed)).toBe('/auditoria/pdde-events.jsonl');
    expect(optionsFromArguments(parsed)).not.toHaveProperty('evidenceStorePath');
  });

  test('não inventa um evidence store quando a entrada não segue o layout padrão', () => {
    expect(evidenceStorePathFromArguments(parseArguments(requiredArguments))).toBeUndefined();
  });

  test('rejeita manifesto e pasta simultâneos', () => {
    expect(() => optionsFromArguments(parseArguments([
      ...requiredArguments,
      '--release-manifest', '/dados/manifest.json',
      '--releases-dir', '/dados/liberacoes',
    ]))).toThrow(/nunca os dois/i);
  });

  test('rejeita URL de procedência sem a pasta correspondente', () => {
    expect(() => optionsFromArguments(parseArguments([
      ...requiredArguments,
      '--releases-source-url', 'https://www.fnde.gov.br/sigefweb/index.php/liberacoes',
    ]))).toThrow(/exige --releases-dir/i);
  });
});
