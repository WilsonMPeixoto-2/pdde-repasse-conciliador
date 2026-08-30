import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const KNOWN_ACCESSIBILITY_DEBT = new Set([
  'color-contrast',
]);

test('home não introduz violações críticas ou sérias fora da dívida conhecida', async ({ page }) => {
  await page.goto('/');

  const results = await new AxeBuilder({ page }).analyze();
  const unexpected = results.violations.filter((violation) => (
    (violation.impact === 'critical' || violation.impact === 'serious')
    && !KNOWN_ACCESSIBILITY_DEBT.has(violation.id)
  ));

  expect(
    unexpected,
    unexpected.map((violation) => (
      `${violation.id}: ${violation.help} (${violation.nodes.length} ocorrência(s))`
    )).join('\n'),
  ).toEqual([]);
});
