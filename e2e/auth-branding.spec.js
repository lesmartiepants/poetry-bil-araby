import { test, expect } from '@playwright/test';
import { loadApp, setupCoreRoutes, skipOnboarding } from './fixtures/mocks';

test.describe('Branded authentication continuity', () => {
  test.beforeEach(async ({ page }) => {
    await setupCoreRoutes(page);
    await skipOnboarding(page);
  });

  test('opens a Poetry-branded, Google-compliant sign-in dialog', async ({ page }) => {
    await loadApp(page);
    await page.locator('button[aria-label="Account menu"]').first().click();
    await page.locator('button[aria-label="Sign in"]').first().click();

    const dialog = page.locator('[data-tour-anchor="auth"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Poetry Bil-Araby')).toBeVisible();
    await expect(dialog.getByText('A Curated Collection Awaits')).toBeVisible();

    const googleButton = dialog.getByRole('button', { name: 'Continue with Google' });
    await expect(googleButton).toBeVisible();
    await expect(googleButton.locator('svg path')).toHaveCount(4);
    await expect(googleButton.locator('svg path').nth(0)).toHaveAttribute('fill', '#4285F4');
    await expect(googleButton.locator('svg path').nth(1)).toHaveAttribute('fill', '#34A853');
    await expect(googleButton.locator('svg path').nth(2)).toHaveAttribute('fill', '#FBBC05');
    await expect(googleButton.locator('svg path').nth(3)).toHaveAttribute('fill', '#EA4335');
    await expect(googleButton).toHaveCSS('background-color', 'rgb(19, 19, 20)');
    await expect(googleButton).toHaveCSS('color', 'rgb(227, 227, 227)');
    await expect(googleButton).toHaveCSS('border-color', 'rgb(142, 145, 143)');

    const poetryFrame = dialog.getByTestId('poetry-google-frame');
    await expect(poetryFrame).toHaveCSS('padding-top', '2px');
    await expect(poetryFrame).not.toHaveCSS('background-image', 'none');

    await expect(dialog.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy.html'
    );
    await expect(dialog.getByRole('link', { name: 'Terms' })).toHaveAttribute(
      'href',
      '/terms.html'
    );
    await expect(
      dialog.getByRole('button', { name: 'Continue reading without an account' })
    ).toBeVisible();
  });

  test('presents cancellation and preserves ordinary reader URL state', async ({ page }) => {
    await page.goto('/?error=access_denied&insightsMode=inline#reader-section');

    await expect(page.getByRole('heading', { name: 'Sign-in cancelled' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try Google again' })).toBeVisible();
    await page.getByRole('button', { name: 'Continue without an account' }).click();

    await expect(page.getByRole('heading', { name: 'Sign-in cancelled' })).toBeHidden();
    await expect(page).toHaveURL(/\?insightsMode=inline#reader-section$/);
  });

  test('serves public legal pages with Poetry identity and mutual links', async ({ page }) => {
    await page.goto('/privacy.html');
    await expect(page).toHaveTitle('Privacy | Poetry Bil-Araby');
    await expect(page.getByRole('heading', { name: 'Privacy' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms.html');

    await page.goto('/terms.html');
    await expect(page).toHaveTitle('Terms | Poetry Bil-Araby');
    await expect(page.getByRole('heading', { name: 'Terms' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy.html'
    );
  });
});
