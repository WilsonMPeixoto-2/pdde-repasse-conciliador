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
        info: meta.info as Record<string, unknown>,
        metadata: meta.metadata as Record<string, unknown>,
      },
    };
  } finally {
    await pdf.destroy();
  }
}
