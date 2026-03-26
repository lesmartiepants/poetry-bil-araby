import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * TDD validation for WS2: Sonner toast integration
 *
 * Validates that Sonner is wired into main.jsx,
 * toast calls exist in fetchPoem.js, and ErrorBanner is deleted.
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

    it('uses bottom-center position', () => {
      const content = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf-8');
      expect(content).toMatch(/position=["']bottom-center["']/);
    });
  });

  describe('fetchPoem.js has toast notifications', () => {
    it('imports toast from sonner', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/fetchPoem.js'), 'utf-8');
      expect(content).toMatch(/import\s*\{[^}]*toast[^}]*\}\s*from\s*['"]sonner['"]/);
    });

    it('calls toast on poem discovery', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/fetchPoem.js'), 'utf-8');
      // Should have at least one toast() call
      expect(content).toMatch(/toast\s*\(/);
    });
  });

  describe('ErrorBanner is removed', () => {
    it('ErrorBanner.jsx does not exist', () => {
      const exists = fs.existsSync(path.join(SRC, 'components/ErrorBanner.jsx'));
      expect(exists).toBe(false);
    });
  });
});
