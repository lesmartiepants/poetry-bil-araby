import { expect, test } from '@playwright/test';
import { fresh, openAa } from './helpers';

test.describe('Area 2 · Reading', () => {
  test('2.1 a poem opens with its title, poet and verses', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await expect(page.getByRole('heading', { name: 'أمرُّ على الديار' })).toBeVisible();
    await expect(page.getByText("I pass by the dwellings, Layla's dwellings,")).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
  });

  test('2.4 Aa: font, size, page and vowel marks apply live and survive a reload', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await openAa(page);
    const aa = page.getByRole('dialog', { name: 'Reading settings' });
    await aa.getByRole('radio', { name: /NASKH/ }).click();
    await aa.getByRole('radio', { name: /PARCHMENT/ }).click();
    await aa.getByRole('switch', { name: 'Vowel marks' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-page', 'parchment');
    await expect(page.getByText('امر علي الديار').or(page.getByText('أمر على الديار ديار ليلى'))).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-page', 'parchment');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--reading-font'))).toContain('Naskh');
  });

  test('2.4 show under the Arabic: Sounds swaps the English for transliteration', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await openAa(page);
    await page.getByRole('radio', { name: 'SOUNDS' }).click();
    await expect(page.getByText("I pass by the dwellings, Layla's dwellings,")).toHaveCount(0);
  });

  test('2.5 Insights opens over the poem with The meaning and The poet', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: 'Insights' }).click();
    const s = page.getByRole('dialog', { name: 'Insights' });
    await expect(s.getByText(/kisses the walls/)).toBeVisible();
    await s.getByRole('radio', { name: 'THE POET' }).click();
    await expect(s.getByText(/Qays ibn al-Mulawwah/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'أمرُّ على الديار' })).toBeVisible();
  });

  test('2.6 tap a word shows its root and meaning in this line', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.locator("[data-line='1'] [data-word='2']").click();
    const s = page.getByRole('dialog', { name: 'Word meaning' });
    await expect(s.getByText(/^ROOT/)).toBeVisible();
    await expect(s.getByText('IN THIS LINE')).toBeVisible();
    await expect(page.locator('.word--selected')).toHaveCount(1);
  });

  test('2.17 the end of the poem offers three different doors, and the guide’s settings change them', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    const end = page.getByRole('region', { name: 'Where the guide would take you next' });
    await expect(end.getByText('WHERE THE GUIDE WOULD TAKE YOU NEXT')).toBeVisible();
    const doors = end.locator('.door-card');
    await expect(doors).toHaveCount(3);
    await expect(doors.nth(0).locator('.door-card__title')).toHaveText('Stop, let us weep');
    await expect(doors.nth(0).locator('.door-card__connection')).toHaveText('Longing, in another poet’s voice');
    await expect(doors.nth(1).locator('.door-card__connection')).toHaveText('A new voice from the Abbasid era');
    await expect(doors.nth(2).locator('.door-card__connection')).toHaveText('A new voice from the Modern era');
    // Leaning modern (12.5) brings the modern poem to the first door.
    await page.evaluate(() => localStorage.setItem('mock.prefs', JSON.stringify({ classicalModern: 1 })));
    await page.reload();
    await expect(doors.first().locator('.door-card__title')).toHaveText('Rain Song');
    await expect(doors.first().locator('.door-card__connection')).toHaveText('Longing, in another poet’s voice');
    await doors.first().click();
    await expect(page).toHaveURL(/unshudat-al-matar/);
  });

  test('2.17 a shared image connects poems with different feelings', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/qadhan');
    const end = page.getByRole('region', { name: 'Where the guide would take you next' });
    const image = end.getByRole('link', { name: 'Dry-eyed, I see Tears, from grief to love Abu Firas' });
    await expect(image.locator('.door-card__text > span')).toHaveText([
      'Dry-eyed, I see',
      'Tears, from grief to love',
      'Abu Firas',
    ]);
    await image.focus();
    await image.press('Enter');
    await expect(page).toHaveURL(/\/p\/araka$/);
  });

  test('the standard reader tabs appear at the start of the Guide and return to Journey', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await fresh(page);
    await page.goto('./');
    await expect(page).toHaveURL(/\/new\/journey$/);
    const tabs = page.getByRole('navigation', { name: 'Main' });
    const tabLinks = () => tabs.getByRole('link').evaluateAll((links) =>
      links.map((link) => [link.getAttribute('aria-label'), link.getAttribute('href')])
    );
    const standardLinks = await tabLinks();
    await page.getByRole('link', { name: 'Explore', exact: true }).click();
    await page.getByRole('link', { name: /Longing/ }).first().click();
    await page.locator('a[href$="/p/amurru"]').first().click();
    await expect(page).toHaveURL(/\/new\/p\/amurru$/);
    const guide = page.getByRole('region', { name: 'Where the guide would take you next' });
    const scrollTop = () => page.evaluate(() => window.scrollY);
    const toBottom = () => page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(tabs).toHaveCount(0);

    await expect(guide.getByRole('link')).toHaveCount(3);
    await guide.evaluate((section) => {
      window.scrollBy(0, section.getBoundingClientRect().top - (window.innerHeight - 220));
    });
    await expect(tabs.getByRole('link', { name: 'Journey' })).toBeInViewport();
    await expect(guide.getByRole('link').last()).not.toBeInViewport();
    expect(await tabLinks()).toEqual(standardLinks);
    await expect(tabs.getByRole('link', { name: 'Explore' })).toHaveAttribute('aria-current', 'location');
    await expect(tabs.locator('[aria-current]')).toHaveCount(1);

    for (let step = 0; step < 2; step++) {
      const doors = guide.getByRole('link');
      await expect(doors).toHaveCount(3);
      await toBottom();
      await expect(tabs.getByRole('link', { name: 'Journey' })).toBeInViewport();
      const next = doors.nth(step);
      const href = await next.getAttribute('href');
      await next.click();
      await expect(page).toHaveURL(new URL(href!, page.url()).href);
      await expect.poll(scrollTop).toBe(0);
      await expect(tabs).toHaveCount(0);
    }

    await expect(guide.getByRole('link')).toHaveCount(3);
    await toBottom();
    await tabs.getByRole('link', { name: 'Journey' }).click();
    await expect(page).toHaveURL(/\/new\/journey$/);
    await expect.poll(scrollTop).toBe(0);
    await expect(page.getByRole('link', { name: 'Enter the poem' })).toBeVisible();
  });

  test('2.2–2.3 scrolling folds the dock into the mark, which opens the fan', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Insights' })).toBeVisible();
  });

  test('2.11 a broken link says so and offers Explore', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/no-such-poem');
    await expect(page.getByRole('alert')).toContainText('This link leads nowhere');
    await page.getByRole('button', { name: 'Go to Explore' }).click();
    await expect(page.getByText('POET OF THE WEEK')).toBeVisible();
  });
});
