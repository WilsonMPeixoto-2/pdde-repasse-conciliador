import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const workflow = readFileSync(
  new URL('../../.github/workflows/antonieta-pdde-probe.yml', import.meta.url),
  'utf8',
);

describe('Antonieta PDDE current-products probe workflow', () => {
  test('probes products 66 and 70 on branch pushes instead of silently falling back to legacy product 24', () => {
    expect(workflow).toContain("push_product_ids: ['66', '70']");
    expect(workflow).toContain('matrix.product_id');
  });

  test('keeps workflow_dispatch able to probe one explicitly selected product', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('inputs.product_id');
  });
});
