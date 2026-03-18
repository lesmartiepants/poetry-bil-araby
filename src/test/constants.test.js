import { describe, it, expect } from 'vitest';
import { FEATURES, DESIGN, BRAND, THEME, GOLD, CATEGORIES, FONTS } from '../constants/index.js';

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

    it('dark theme has gold hex value', () => {
      expect(THEME.dark.gold).toBe('#C5A059');
    });

    it('light theme has gold hex value', () => {
      expect(THEME.light.gold).toBe('#8B7355');
    });
  });

  describe('GOLD', () => {
    it('is an alias for THEME.dark', () => {
      expect(GOLD).toBe(THEME.dark);
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
