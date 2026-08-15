import { describe, expect, test, vi } from 'vitest';

const subjectUrl = new URL('../../backend/report/html-pdf-renderer.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('renderizador HTML para PDF', () => {
  test('usa configuração institucional segura sem depender de Chromium no teste', async () => {
    const subject = await loadSubject();
    expect(subject, 'o renderizador PDF ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const render = subject.renderHtmlPdf as (
      input: Record<string, unknown>,
      browserFactory?: () => Promise<any>,
    ) => Promise<Uint8Array>;

    const pdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-fake'));
    const setContent = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const page = { setContent, pdf };
    const browserFactory = vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue(page),
      close,
    });

    const bytes = await render({
      html: '<main><h1>Relatório PDDE</h1></main>',
      title: 'Relatório PDDE',
    }, browserFactory);

    expect(Buffer.from(bytes).toString()).toContain('%PDF-fake');
    expect(setContent).toHaveBeenCalledWith(expect.stringContaining('Relatório PDDE'), expect.objectContaining({ waitUntil: 'networkidle' }));
    expect(pdf).toHaveBeenCalledWith(expect.objectContaining({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
    }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  test('fecha o browser mesmo quando a renderização falha', async () => {
    const subject = await loadSubject();
    expect(subject, 'o renderizador PDF ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const render = subject.renderHtmlPdf as (
      input: Record<string, unknown>,
      browserFactory?: () => Promise<any>,
    ) => Promise<Uint8Array>;
    const close = vi.fn().mockResolvedValue(undefined);
    const error = new Error('falha no Chromium');
    const browserFactory = vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn().mockResolvedValue(undefined),
        pdf: vi.fn().mockRejectedValue(error),
      }),
      close,
    });

    await expect(render({ html: '<p>x</p>' }, browserFactory)).rejects.toBe(error);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
