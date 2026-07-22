import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * TDD validation for WS2: Sonner toast integration
 *
 * Validates that Sonner is wired into main.jsx,
 * discovery toasts were removed from fetchPoem.js, and ErrorBanner is deleted.
 */

const SRC = path.resolve(__dirname, '..');

describe('WS2: Sonner integration', () => {
  describe('main.jsx has Toaster component', () => {
    it('imports Toaster from sonner', () => {
      const content = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf-8');
      expect(content).toMatch(/import\s*\{[^}]*Toaster[^}]*\}\s*from\s*['"]sonner['"]/);
    });

    it('renders <Toaster', () => {
      const content = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf-8');
      expect(content).toMatch(/<Toaster/);
    });

    it('uses top-center position', () => {
      // Position was changed to top-center (commit b9ae900) for better UX on mobile
      const content = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf-8');
      expect(content).toMatch(/position=["']top-center["']/);
    });
  });

  describe('fetchPoem.js does not toast on discovery', () => {
    it('does not import toast from sonner', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/fetchPoem.js'), 'utf-8');
      expect(content).not.toMatch(/import\s*\{[^}]*toast[^}]*\}\s*from\s*['"]sonner['"]/);
    });

    it('does not call toast during poem discovery', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/fetchPoem.js'), 'utf-8');
      expect(content).not.toMatch(/toast\s*\(\s*['"]New poem discovered['"]/);
    });
  });

  describe('ErrorBanner is removed', () => {
    it('ErrorBanner.jsx does not exist', () => {
      const exists = fs.existsSync(path.join(SRC, 'components/ErrorBanner.jsx'));
      expect(exists).toBe(false);
    });
  });
});
