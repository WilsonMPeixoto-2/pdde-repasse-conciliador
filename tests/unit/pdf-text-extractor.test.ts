import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/pdf-text-extractor.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function minimalPdf(text: string): Uint8Array {
  const escaped = text.replace(/[()\\]/g, (char) => `\\${char}`);
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${escaped.length + 35} >>\nstream\nBT /F1 12 Tf 72 720 Td (${escaped}) Tj ET\nendstream`,
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body, 'binary'));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(body, 'binary');
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    body += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, 'binary'));
}

describe('extração de PDF digital', () => {
  test('extrai texto por página e texto agregado sem OCR', async () => {
    const subject = await loadSubject();
    expect(subject, 'o extrator PDF ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const extractPdfText = subject.extractPdfText as (bytes: Uint8Array) => Promise<Record<string, unknown>>;

    const result = await extractPdfText(minimalPdf('PDDE 2026 - teste'));
    expect(result.totalPages).toBe(1);
    expect(result.pages).toEqual([expect.stringContaining('PDDE 2026')]);
    expect(result.mergedText).toContain('PDDE 2026');
    expect(result).toHaveProperty('metadata');
  });

  test('rejeita conteúdo que não é PDF em vez de fabricar texto', async () => {
    const subject = await loadSubject();
    expect(subject, 'o extrator PDF ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const extractPdfText = subject.extractPdfText as (bytes: Uint8Array) => Promise<unknown>;
    await expect(extractPdfText(new Uint8Array(Buffer.from('não é pdf')))).rejects.toThrow();
  });
});
