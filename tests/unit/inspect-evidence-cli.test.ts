import { describe, expect, test } from 'vitest';
import {
  optionsFromArguments,
  parseArguments,
} from '../../scripts/inspect-evidence';

describe('CLI inspect-evidence', () => {
  test('consulta uma execução por runId', () => {
    expect(optionsFromArguments(parseArguments([
      '--store', '/dados/evidence/events.jsonl',
      '--run', 'run-001',
    ]))).toEqual({
      storePath: '/dados/evidence/events.jsonl',
      mode: 'run',
      value: 'run-001',
    });
  });

  test('consulta o histórico de uma escola por INEP', () => {
    expect(optionsFromArguments(parseArguments([
      '--store', '/dados/evidence/events.jsonl',
      '--school', '33069247',
    ]))).toEqual({
      storePath: '/dados/evidence/events.jsonl',
      mode: 'school',
      value: '33069247',
    });
  });

  test('exige exatamente um alvo de consulta', () => {
    expect(() => optionsFromArguments(parseArguments([
      '--store', '/dados/events.jsonl',
    ]))).toThrow(/--run ou --school/i);
    expect(() => optionsFromArguments(parseArguments([
      '--store', '/dados/events.jsonl', '--run', 'a', '--school', '33069247',
    ]))).toThrow(/nunca os dois/i);
  });

  test('rejeita argumento desconhecido', () => {
    expect(() => parseArguments([
      '--store', '/dados/events.jsonl', '--run', 'a', '--banana', 'sim',
    ])).toThrow(/desconhecido/i);
  });
});
