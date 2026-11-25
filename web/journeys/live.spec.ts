// @live journeys: the same flows against server.js and a seeded Postgres,
// for the domains already live in core/sources.ts. Run: npm run test:journeys:live
import { expect, test } from '@playwright/test';
import { fresh } from './helpers';

const API = process.env.API_PROXY ?? 'http://localhost:3001';

test.describe('@live V1 against the real API', () => {
  test('@live 4.1 Explore shows the poet of the week, feelings and difficulty bands from the database', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    await expect(page.getByText('A fixture poet of the week.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Nostalgia/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Gentle/ })).toBeVisible();
  });

  test('@live 4.4 a feeling lists its poems and opens one in the reader', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore/feeling/nostalgia');
    await expect(page.getByRole('heading', { name: 'Nostalgia' })).toBeVisible();
    await page.locator('.list-row').first().click();
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
  });

  test('@live 4.7 each difficulty band has poems', async ({ page }) => {
    await fresh(page);
    for (const band of ['gentle', 'measured', 'demanding']) {
      await page.goto(`./explore/difficulty/${band}`);
      await expect(page.locator('.list-row').first()).toBeVisible();
    }
  });

  test('@live 2.1 + 2.5 a poem with its translation, and its stored explanation', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/24');
    await expect(page.getByText('A second line made for testing')).toBeVisible();
    await page.getByRole('button', { name: 'Insights' }).click();
    await expect(page.getByRole('dialog', { name: 'Insights' }).getByText('A fixture explanation')).toBeVisible();
  });

  test('@live 2.17 with the guide live, every poem ends with three doors that have reasons', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/24');
    const doors = page.getByRole('region', { name: 'Where the guide would take you next' }).locator('.door-card');
    await expect(doors).toHaveCount(3);
    // Each door has its own hook, in specific words (the local server has no Gemini key).
    const hooks = await doors.locator('.door-card__hook').allTextContents();
    expect(new Set(hooks).size).toBe(3);
    await doors.first().click();
    await expect(page).not.toHaveURL(/\/p\/24$/);
  });

  test('@live 2.11 an unknown poem id says the link leads nowhere', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/999999');
    await expect(page.getByRole('alert')).toContainText('This link leads nowhere');
  });

  test('@live 5.1 a poet page lists the poet’s poems', async ({ page }) => {
    await fresh(page);
    await page.goto('./poet/test-poet-five');
    await expect(page.getByRole('heading', { name: 'شاعرة الاختبار الخامسة' })).toBeVisible();
    await expect(page.locator('.poet-poem').first()).toBeVisible();
    await expect(page.getByText(/NAJD ·/)).toBeVisible();
  });
});

test.describe('@live V3 against the real API', () => {
  test('@live 9.4 Tonight is the same pick for everyone and names its journey step', async ({ page }) => {
    await fresh(page);
    await page.goto('./journey');
    await expect(page.getByText('CHOSEN FOR YOU · HEAVEN 1 OF FIXTURE JOURNEY')).toBeVisible();
    await expect(page.getByText('A fixture reason for tonight.')).toBeVisible();
    await page.getByRole('link', { name: 'Enter the poem' }).click();
    await expect(page.getByText('A second line made for testing')).toBeVisible();
  });

  test('@live 9.5–9.6 Pathways lists the published journeys and opens one', async ({ page }) => {
    await fresh(page);
    await page.goto('./journey');
    // Tonight swaps its loading state for content and re-renders the tabs; a click before that
    // lands on a detached radio (flaked on main CI). Wait for Tonight's content first.
    await expect(page.getByText('A fixture reason for tonight.')).toBeVisible();
    await page.getByRole('radio', { name: 'PATHWAYS' }).click();
    await page.getByRole('link', { name: /Fixture journey/ }).click();
    await expect(page.getByRole('heading', { name: 'Fixture journey' })).toBeVisible();
    await expect(page.getByText('JOURNEY · 0 OF 3 READ')).toBeVisible();
  });

  test('@live 10.2 a collection lists its poems in order', async ({ page }) => {
    await fresh(page);
    await page.goto('./collection/fixture-collection');
    await expect(page.getByText('01', { exact: true })).toBeVisible();
    await expect(page.getByText('02', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /POEM 01/ })).toBeVisible();
  });

  test('@live 5.3 the poet tab shows where to find the poet', async ({ page }) => {
    await fresh(page);
    await page.goto('./poet/test-poet-five/about');
    await expect(page.getByText(/FIND TEST POET FIVE IN/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Fixture journey/ })).toBeVisible();
  });

  test('@live 11.2 a line search ignores vowel marks; 11.3 nothing found offers the closest', async ({ page }) => {
    await fresh(page);
    await page.goto('./search');
    await page.getByRole('textbox', { name: /Search/ }).fill('الحنين');
    await expect(page.locator('.search-section', { hasText: 'LINES' })).toBeVisible();
    await page.getByRole('textbox', { name: /Search/ }).fill('zzzz');
    await expect(page.getByText('CLOSEST MATCHES:')).toBeVisible();
  });

  test('@live 7.11 a saved card is a 1080 × 1350 PNG from the server', async ({ request }) => {
    const res = await request.get(`${API}/api/v2/poems/24/card.png?en=1&cw=cobalt&for=Nour`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
    const png = await res.body();
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1350);
    expect((await request.get(`${API}/api/v2/poems/24/card.png?lines=99`)).status()).toBe(400);
  });
  // V7 recitation. The server runs with TTS_FAKE=1 (a quiet tone), so no Gemini key is needed.
  test('@live 3.1 a recitation is generated once, stored, and served as audio', async ({ request }) => {
    const url = `${API}/api/v2/poems/24/recitation?voice=Orus`;
    const first = await request.get(url);
    expect(first.status()).toBe(200);
    const r = await first.json();
    expect(r.lineStarts).toHaveLength(3);
    expect(r.duration).toBeGreaterThan(0);
    expect((await (await request.get(url)).json()).cached).toBe(true);
    const wav = await request.get(`${API}${r.url}`);
    expect(wav.headers()['content-type']).toBe('audio/wav');
    expect((await wav.body()).subarray(0, 4).toString()).toBe('RIFF');
    expect((await request.get(`${API}/api/v2/poems/24/recitation?voice=Nobody`)).status()).toBe(400);
    expect((await request.get(`${API}/api/v2/poems/999999/recitation?voice=Orus`)).status()).toBe(404);
  });

  test('@live 3.2 listening plays the real recitation line by line to the end', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/24');
    const audio = page.waitForResponse((r) => r.url().includes('/recitation.wav'));
    await page.getByRole('button', { name: /LISTEN/ }).click();
    expect((await audio).status()).toBe(200);
    const player = page.getByRole('navigation', { name: 'Now playing' });
    await expect(player.getByText('LINE 1 OF 3')).toBeVisible();
    await expect(player.getByText('LINE 2 OF 3')).toBeVisible({ timeout: 8000 });
    await player.getByRole('button', { name: 'Pause' }).click();
    await expect(player.getByRole('button', { name: 'Play' })).toBeVisible();
    await player.getByRole('button', { name: 'Play' }).click();
    await expect(player).toHaveCount(0, { timeout: 10_000 }); // the recitation ended
  });

  test('@live 3.8 a recitation that will not load offers Try again, and it recovers', async ({ page }) => {
    await fresh(page);
    await page.route('**/recitation?*', (route) => route.fulfill({ status: 500, json: { error: 'x' } }));
    await page.goto('./p/24');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    const note = page.getByRole('button', { name: /The recitation won’t load/ });
    await expect(note).toBeVisible();
    await page.unroute('**/recitation?*');
    await note.click();
    await expect(page.getByRole('navigation', { name: 'Now playing' })).toBeVisible();
  });
  test('@live 12.6 Pause between lines holds a breath after each bayt', async ({ page, request }) => {
    const { lineStarts } = await (await request.get(`${API}/api/v2/poems/24/recitation?voice=Zephyr`)).json();
    await fresh(page);
    await page.goto('./you/reciter');
    await page.getByRole('switch', { name: 'Pause between lines' }).click();
    await page.evaluate(() => { history.pushState({}, '', '/new/p/24'); dispatchEvent(new PopStateEvent('popstate')); });
    await page.getByRole('button', { name: /LISTEN/ }).click();
    const player = page.getByRole('navigation', { name: 'Now playing' });
    await expect(player.getByText('LINE 1 OF 3')).toBeVisible();
    const t0 = Date.now();
    await expect(player.getByText('LINE 3 OF 3')).toBeVisible({ timeout: 12_000 });
    // Without breaths, line 3 begins lineStarts[2] seconds in; with one before it, about 0.9 s later.
    expect((Date.now() - t0) / 1000).toBeGreaterThan(lineStarts[2] + 0.6);
  });
});
