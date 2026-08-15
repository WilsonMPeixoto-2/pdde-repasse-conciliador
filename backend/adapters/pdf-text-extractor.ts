import { extractText, getDocumentProxy, getMeta } from 'unpdf';

export interface ExtractedPdfText {
  totalPages: number;
  pages: string[];
  mergedText: string;
  metadata: {
    info: Record<string, unknown>;
    metadata: Record<string, unknown>;
  };
}

function isPdf(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) return false;
  return String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-';
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value));
}

async function destroyIfSupported(pdf: unknown): Promise<void> {
  if (!pdf || typeof pdf !== 'object' || !('destroy' in pdf)) return;
  const destroy = (pdf as { destroy?: () => void | Promise<void> }).destroy;
  if (typeof destroy === 'function') await destroy.call(pdf);
}

export async function extractPdfText(bytes: Uint8Array): Promise<ExtractedPdfText> {
  if (!isPdf(bytes)) throw new Error('O arquivo informado não possui assinatura PDF válida.');
  const pdf = await getDocumentProxy(bytes);
  try {
    const [textResult, meta] = await Promise.all([
      extractText(pdf, { mergePages: false }),
      getMeta(pdf, { parseDates: false }),
    ]);
    const pages = textResult.text.map((page) => page.trim());
    return {
      totalPages: textResult.totalPages,
      pages,
      mergedText: pages.join('\n\f\n'),
      metadata: {
        info: objectRecord(meta.info),
        metadata: objectRecord(meta.metadata),
      },
    };
  } finally {
    await destroyIfSupported(pdf);
  }
}
