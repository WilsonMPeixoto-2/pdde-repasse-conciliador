import { chromium } from 'playwright';

interface PdfPageLike {
  setContent(html: string, options: { waitUntil: 'networkidle' }): Promise<void>;
  pdf(options: {
    format: 'A4';
    printBackground: boolean;
    displayHeaderFooter: boolean;
    margin: { top: string; right: string; bottom: string; left: string };
  }): Promise<Uint8Array>;
}

interface PdfBrowserLike {
  newPage(): Promise<PdfPageLike>;
  close(): Promise<void>;
}

export type HtmlPdfBrowserFactory = () => Promise<PdfBrowserLike>;

export interface HtmlPdfRenderInput {
  html: string;
  title?: string;
  margins?: Partial<{ top: string; right: string; bottom: string; left: string }>;
}

const DEFAULT_MARGINS = {
  top: '15mm',
  right: '12mm',
  bottom: '15mm',
  left: '12mm',
};

async function defaultBrowserFactory(): Promise<PdfBrowserLike> {
  return chromium.launch({ headless: true }) as Promise<unknown> as Promise<PdfBrowserLike>;
}

export async function renderHtmlPdf(
  input: HtmlPdfRenderInput,
  browserFactory: HtmlPdfBrowserFactory = defaultBrowserFactory,
): Promise<Uint8Array> {
  if (!input.html.trim()) throw new Error('HTML vazio não pode ser convertido em PDF.');
  const browser = await browserFactory();
  try {
    const page = await browser.newPage();
    await page.setContent(input.html, { waitUntil: 'networkidle' });
    const bytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { ...DEFAULT_MARGINS, ...input.margins },
    });
    return new Uint8Array(bytes);
  } finally {
    await browser.close();
  }
}
