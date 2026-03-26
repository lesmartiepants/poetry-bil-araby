import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * TDD validation for WS1: rem conversion
 *
 * These tests assert that NO hardcoded px text sizes remain
 * in the converted files. They should FAIL before the rem-agent
 * runs and PASS after.
 */

const SRC = path.resolve(__dirname, '..');

// Files that the rem-agent must convert
const REM_TARGET_FILES = [
  'components/VerticalSidebar.jsx',
  'components/PoetPicker.jsx',
  'components/DiscoverDrawer.jsx',
  'components/DesktopInsightPane.jsx',
  'components/InsightsDrawer.jsx',
  'components/PoemCard.jsx',
  'components/DebugPanel.jsx',
  'components/auth/SavePoemButton.jsx',
  'components/auth/DownvoteButton.jsx',
  'components/auth/AuthModal.jsx',
  'components/SplashScreen.jsx',
];

// Matches text-[Xpx] Tailwind arbitrary values (font sizes)
const PX_TEXT_PATTERN = /text-\[\d+(\.\d+)?px\]/g;

// Matches inline fontSize with px
const PX_FONTSIZE_PATTERN = /fontSize:\s*['"][\d.]+px['"]/g;

describe('WS1: rem conversion', () => {
  describe('component files have no px text sizes', () => {
    REM_TARGET_FILES.forEach((file) => {
      it(`${file} has no text-[Xpx] classes`, () => {
        const filePath = path.join(SRC, file);
        if (!fs.existsSync(filePath)) return; // skip if file doesn't exist yet
        const content = fs.readFileSync(filePath, 'utf-8');
        const pxMatches = content.match(PX_TEXT_PATTERN) || [];
        expect(pxMatches, `Found px text sizes in ${file}: ${pxMatches.join(', ')}`).toEqual([]);
      });

      it(`${file} has no inline fontSize px`, () => {
        const filePath = path.join(SRC, file);
        if (!fs.existsSync(filePath)) return;
        const content = fs.readFileSync(filePath, 'utf-8');
        const pxMatches = content.match(PX_FONTSIZE_PATTERN) || [];
        expect(pxMatches, `Found px fontSize in ${file}: ${pxMatches.join(', ')}`).toEqual([]);
      });
    });
  });

  describe('design constants have no px text sizes', () => {
    it('design.js BRAND_HEADER has no px fontSize', () => {
      const content = fs.readFileSync(path.join(SRC, 'constants/design.js'), 'utf-8');
      // Extract BRAND_HEADER section and check for px in fontSize
      const brandHeaderMatch = content.match(/BRAND_HEADER\s*=\s*\{[\s\S]*?\n\};/);
      if (!brandHeaderMatch) return;
      const pxMatches = brandHeaderMatch[0].match(/fontSize:\s*['"][\d.]+px['"]/g) || [];
      expect(pxMatches, `BRAND_HEADER has px fontSize: ${pxMatches.join(', ')}`).toEqual([]);
    });

    it('design.js mainTagSize has no px', () => {
      const content = fs.readFileSync(path.join(SRC, 'constants/design.js'), 'utf-8');
      const match = content.match(/mainTagSize:\s*['"]([^'"]+)['"]/);
      if (!match) return;
      expect(match[1]).not.toMatch(/\dpx/);
    });

    it('design.js mainSubtitleSize clamp has no px', () => {
      const content = fs.readFileSync(path.join(SRC, 'constants/design.js'), 'utf-8');
      const match = content.match(/mainSubtitleSize:\s*['"]([^'"]+)['"]/);
      if (!match) return;
      expect(match[1]).not.toMatch(/\dpx/);
    });
  });

  describe('app.css has rem padding', () => {
    it('.minimal-frame uses rem not px for padding', () => {
      const content = fs.readFileSync(path.join(SRC, 'styles/app.css'), 'utf-8');
      // Find all padding declarations in .minimal-frame
      const minimalFrame = content.match(/\.minimal-frame\s*\{[^}]*\}/g) || [];
      const allPadding = minimalFrame.join(' ');
      const pxPadding = allPadding.match(/padding:\s*[\d.]+px/g) || [];
      expect(pxPadding, `minimal-frame still has px padding: ${pxPadding.join(', ')}`).toEqual([]);
    });

    it('ratchetToastIn keyframe is removed', () => {
      const content = fs.readFileSync(path.join(SRC, 'styles/app.css'), 'utf-8');
      expect(content).not.toMatch(/ratchetToastIn/);
    });
  });

  describe('excluded files still use px (correctly)', () => {
    it('shareCardDesigns.js still uses px for Canvas API', () => {
      const filePath = path.join(SRC, 'utils/shareCardDesigns.js');
      if (!fs.existsSync(filePath)) return;
      const content = fs.readFileSync(filePath, 'utf-8');
      // Canvas font strings SHOULD have px
      expect(content).toMatch(/px\s+["']?\w/); // e.g., 54px "Reem Kufi"
    });
  });
});
