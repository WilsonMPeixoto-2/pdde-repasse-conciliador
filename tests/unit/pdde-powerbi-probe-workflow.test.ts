import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const workflowUrl = new URL('../../.github/workflows/pdde-powerbi-probe.yml', import.meta.url);

const pddeTotalPublicReport =
  'https://app.powerbi.com/view?r=eyJrIjoiNjBiNjZkZmYtMDRiZS00ZDRkLTkzMzUtNDkyZDk2ZDI4ZWQ4IiwidCI6ImNmODQ1NGQzLWUwMTItNGE5ZC05NWIzLTcwYmRiNmY0NTlkNSJ9';

describe('PDDE public Power BI probe workflow', () => {
  test('provides a reproducible browser probe for the official PDDE Total public report', () => {
    expect(existsSync(workflowUrl)).toBe(true);

    if (!existsSync(workflowUrl)) return;
    const workflow = readFileSync(workflowUrl, 'utf8');

    expect(workflow).toContain(pddeTotalPublicReport);
    expect(workflow).toMatch(/playwright|chromium/i);
    expect(workflow).toContain('upload-artifact');
  });

  test('preserves diagnostic evidence needed to assess whether a stable school or UEx export exists', () => {
    if (!existsSync(workflowUrl)) return;
    const workflow = readFileSync(workflowUrl, 'utf8');

    expect(workflow).toMatch(/screenshot/i);
    expect(workflow).toMatch(/html|content/i);
    expect(workflow).toMatch(/export|download/i);
  });

  test('keeps the panel secondary and does not promote it to proof of observed bank credit', () => {
    if (!existsSync(workflowUrl)) return;
    const workflow = readFileSync(workflowUrl, 'utf8');

    expect(workflow).toMatch(/diagnostic|probe/i);
    expect(workflow).not.toMatch(/credit[oó].*confirmado|confirmed.*credit|bank.*credit.*confirmed/i);
  });
});
