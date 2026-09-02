import { expect, test } from '@playwright/test';

test('usuário encontra uma escola e chega ao prontuário financeiro', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /Inteligência financeira/i }),
  ).toBeVisible();

  await expect(
    page.getByRole('button', { name: 'Fazer nova consulta' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Baixar planilha Excel' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Escolas', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Unidades da 4ª CRE' }),
  ).toBeVisible();

  const search = page.getByRole('searchbox', { name: 'Buscar unidade' });
  await search.fill('Zélia Braune');

  const schoolLink = page.getByRole('link', { name: /ZELIA BRAUNE/i });
  await expect(schoolLink).toBeVisible();
  await schoolLink.click();

  await expect(
    page.getByRole('heading', { name: /ZELIA BRAUNE/i }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Repasses' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Contas e saldos' })).toBeVisible();
});
