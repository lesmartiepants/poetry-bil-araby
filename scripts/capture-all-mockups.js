// Capture all splash screen mockups
import { chromium } from 'playwright';

const mockups = [
  // Original three
  { id: 'modern', name: 'modern-bold' },
  { id: 'minimalist', name: 'minimalist-clean' },
  { id: 'arabian', name: 'arabian-warm' },

  // Round 1: Arabian variations
  { id: '1', name: '1-arabian-original' },
  { id: '2', name: '2-arabian-maximalist' },
  { id: '3a', name: '3a-arabian-teal' },
  { id: '3b', name: '3b-arabian-blue' },
  { id: '3c', name: '3c-arabian-burgundy' },

  // Round 2: Final refinements
  { id: '4a', name: '4a-arabian-indigo' },
  { id: '4b', name: '4b-islamic-geometric' },
  { id: '4c', name: '4c-manuscript-parchment' },

  // Round 3: Wildcards & new directions
  { id: '5a', name: '5a-brutalist-swiss' },
  { id: '5b', name: '5b-aurora-gradient' },
  { id: '5c', name: '5c-terminal-developer' },
  { id: '5d', name: '5d-editorial-magazine' },
  { id: '5e', name: '5e-cinematic-film' },

  // Round 4: Creative freedom
  { id: '6a', name: '6a-brutalist-colors' },
  { id: '6b', name: '6b-neo-brutalist-pastels' },
  { id: '6c', name: '6c-editorial-colored' },
  { id: '6d', name: '6d-magazine-spread' },
  { id: '6e', name: '6e-cinematic-colored' },
  { id: '6f', name: '6f-art-house-gradients' },
];

(async () => {
  console.log(`\n🎨 Capturing ${mockups.length} splash screen designs...`);
  console.log(`📸 Total screenshots: ${mockups.length * 2} (dark + light for each)\n`);

  const browser = await chromium.launch({ headless: true });

  for (let i = 0; i < mockups.length; i++) {
    const mockup = mockups[i];
    const progress = `[${i + 1}/${mockups.length}]`;

    console.log(`${progress} Capturing ${mockup.name}...`);

    const page = await browser.newPage();

    // Navigate with mockup parameter
    await page.goto(`http://localhost:5177?mockup=${mockup.id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500); // Extra time for animations/gradients

    // Capture dark mode
    console.log(`  - ${mockup.name}-dark.png`);
    await page.screenshot({
      path: `mockups/${mockup.name}-dark.png`,
      fullPage: true
    });

    // Toggle to light mode
    const themeToggle = page.locator('button').first();
    await themeToggle.click();
    await page.waitForTimeout(500);

    // Capture light mode
    console.log(`  - ${mockup.name}-light.png`);
    await page.screenshot({
      path: `mockups/${mockup.name}-light.png`,
      fullPage: true
    });

    await page.close();
  }

  console.log('\n✅ All mockups captured successfully!');
  console.log(`\n📁 Files created in mockups/:`);
  console.log(`   - ${mockups.length * 2} total screenshots`);
  console.log(`   - ${mockups.length} designs × 2 themes (dark + light)`);

  await browser.close();
})();
