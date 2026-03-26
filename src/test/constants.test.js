import { describe, it, expect } from 'vitest';
import { FEATURES, DESIGN, BRAND, THEME, GOLD, COLORS, CATEGORIES, FONTS } from '../constants/index.js';

describe('Constants', () => {
  describe('FEATURES', () => {
    it('exports all feature flags', () => {
      expect(FEATURES).toHaveProperty('debug');
      expect(FEATURES).toHaveProperty('logging');
      expect(FEATURES).toHaveProperty('caching');
      expect(FEATURES).toHaveProperty('streaming');
      expect(FEATURES).toHaveProperty('prefetching');
      expect(FEATURES).toHaveProperty('database');
      expect(FEATURES).toHaveProperty('onboarding');
    });
  });

  describe('DESIGN', () => {
    it('exports layout and typography tokens', () => {
      expect(DESIGN).toHaveProperty('glass');
      expect(DESIGN).toHaveProperty('anim');
      expect(DESIGN).toHaveProperty('mainFontSize');
      expect(DESIGN).toHaveProperty('touchTarget');
    });
  });

  describe('BRAND', () => {
    it('exports arabic, english, and feather styles', () => {
      expect(BRAND.arabic).toHaveProperty('fontFamily');
      expect(BRAND.english).toHaveProperty('fontFamily');
      expect(BRAND.feather).toHaveProperty('opacity');
    });
  });

  describe('THEME', () => {
    it('exports dark and light themes', () => {
      expect(THEME.dark).toHaveProperty('bg');
      expect(THEME.dark).toHaveProperty('gold');
      expect(THEME.light).toHaveProperty('bg');
      expect(THEME.light).toHaveProperty('gold');
    });

    it('dark theme has gold CSS var', () => {
      expect(THEME.dark.gold).toBe('var(--gold)');
    });

    it('light theme has gold CSS var', () => {
      expect(THEME.light.gold).toBe('var(--gold)');
    });

    it('exports inline style tokens for both themes', () => {
      for (const mode of ['dark', 'light']) {
        expect(THEME[mode]).toHaveProperty('brandHeaderTextColor');
        expect(THEME[mode]).toHaveProperty('poetCardColor');
        expect(THEME[mode]).toHaveProperty('subtitleCardColor');
        expect(THEME[mode]).toHaveProperty('searchInputTextColor');
        expect(THEME[mode]).toHaveProperty('fadeSolid');
        expect(THEME[mode]).toHaveProperty('fadeAlpha85');
        expect(THEME[mode]).toHaveProperty('fadeAlpha40');
        expect(THEME[mode]).toHaveProperty('insightDrawerBg');
        expect(THEME[mode]).toHaveProperty('authModalCardBg');
        expect(THEME[mode]).toHaveProperty('discoverDrawerBg');
        expect(THEME[mode]).toHaveProperty('textInline');
        expect(THEME[mode]).toHaveProperty('subTextInline');
        expect(THEME[mode]).toHaveProperty('subtleBorderInline');
        expect(THEME[mode]).toHaveProperty('cardBgInline');
        expect(THEME[mode]).toHaveProperty('stickyBgInline');
      }
    });
  });

  describe('GOLD', () => {
    it('is an alias for THEME.dark', () => {
      expect(GOLD).toBe(THEME.dark);
    });
  });

  describe('COLORS', () => {
    it('exports gold alpha palette', () => {
      expect(COLORS.gold).toHaveProperty('alpha8');
      expect(COLORS.gold).toHaveProperty('alpha20');
      expect(COLORS.gold).toHaveProperty('alpha60');
      expect(COLORS.gold.alpha8).toMatch(/^rgba\(/);
    });

    it('exports ratchet mode colors', () => {
      expect(COLORS.ratchet).toHaveProperty('orange');
      expect(COLORS.ratchet).toHaveProperty('glowGradient');
      expect(COLORS.ratchet).toHaveProperty('toastOnBg');
    });

    it('exports error boundary colors', () => {
      expect(COLORS.error).toHaveProperty('bg');
      expect(COLORS.error).toHaveProperty('text');
      expect(COLORS.error).toHaveProperty('btnBg');
      expect(COLORS.error).toHaveProperty('btnHover');
    });

    it('exports splash screen colors', () => {
      expect(COLORS.splash).toHaveProperty('star');
      expect(COLORS.splash).toHaveProperty('btnBorder');
      expect(COLORS.splash).toHaveProperty('btnHoverBorder');
      expect(COLORS.splash).toHaveProperty('btnText');
    });

    it('exports shared UI tokens', () => {
      expect(COLORS).toHaveProperty('controlBarShadow');
      expect(COLORS).toHaveProperty('toastShadow');
      expect(COLORS).toHaveProperty('white');
      expect(COLORS).toHaveProperty('black');
    });
  });

  describe('CATEGORIES', () => {
    it('exports poet categories with All as first', () => {
      expect(CATEGORIES[0].id).toBe('All');
      expect(CATEGORIES.length).toBeGreaterThan(1);
    });

    it('each category has id, label, and labelAr', () => {
      CATEGORIES.forEach((cat) => {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('label');
        expect(cat).toHaveProperty('labelAr');
      });
    });
  });

  describe('FONTS', () => {
    it('exports font options with Amiri as first', () => {
      expect(FONTS[0].id).toBe('Amiri');
      expect(FONTS.length).toBeGreaterThan(1);
    });

    it('each font has id, label, labelAr, and family', () => {
      FONTS.forEach((font) => {
        expect(font).toHaveProperty('id');
        expect(font).toHaveProperty('label');
        expect(font).toHaveProperty('labelAr');
        expect(font).toHaveProperty('family');
      });
    });
  });
});
