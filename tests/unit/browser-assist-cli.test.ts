import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../scripts/browser-assist.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('CLI de browser assistido', () => {
  test('exige URL e permite saída HTML explícita', async () => {
    const subject = await loadSubject();
    expect(subject, 'a CLI de browser assistido ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const parse = subject.parseBrowserAssistArgs as (args: string[]) => Record<string, unknown>;
    expect(parse(['https://www.fnde.gov.br/', '--output', 'tmp/fnde.html'])).toEqual({
      url: 'https://www.fnde.gov.br/',
      output: 'tmp/fnde.html',
      interactive: true,
    });
  });

  test('recusa URL não HTTP e parâmetros desconhecidos', async () => {
    const subject = await loadSubject();
    expect(subject, 'a CLI de browser assistido ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const parse = subject.parseBrowserAssistArgs as (args: string[]) => Record<string, unknown>;
    expect(() => parse(['file:///etc/passwd'])).toThrow(/http/i);
    expect(() => parse(['https://gov.br', '--magia'])).toThrow(/parâmetro/i);
  });
});
