import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const workflowUrl = new URL('../../.github/workflows/sigpc-public-uex-probe.yml', import.meta.url);

describe('SiGPC public UEx probe workflow', () => {
  test('provides a reproducible browser probe for the official public UEx consultation', () => {
    expect(existsSync(workflowUrl)).toBe(true);

    if (!existsSync(workflowUrl)) return;
    const workflow = readFileSync(workflowUrl, 'utf8');

    expect(workflow).toContain('https://www.fnde.gov.br/sigpcadm/actionPublico.pu?tilesPublico=ConsultarSituacao');
    expect(workflow).toMatch(/playwright|chromium/i);
    expect(workflow).toContain('upload-artifact');
  });

  test('keeps the probe diagnostic-only and does not attempt to bypass access controls', () => {
    if (!existsSync(workflowUrl)) return;
    const workflow = readFileSync(workflowUrl, 'utf8');

    expect(workflow).toMatch(/diagnostic|probe/i);
    expect(workflow).not.toMatch(/captcha.*bypass|bypass.*captcha|disable.*waf|waf.*bypass/i);
  });
});
