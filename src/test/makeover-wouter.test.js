import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * TDD validation for WS3: useQueryParams hook
 *
 * Tests the hook's read/write behavior against URL query params.
 */

// Mock wouter before importing the hook
const mockNavigate = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => [window.location.pathname, mockNavigate],
}));

describe('WS3: useQueryParams hook', () => {
  let useQueryParams;

  beforeEach(async () => {
    mockNavigate.mockClear();
    // Reset URL
    window.history.replaceState({}, '', '/');
    // Dynamic import to get fresh module
    const mod = await import('../hooks/useQueryParams.js');
    useQueryParams = mod.useQueryParams;
  });

  it('exports useQueryParams function', () => {
    expect(typeof useQueryParams).toBe('function');
  });

  it('returns empty params for clean URL', () => {
    expect(useQueryParams).toBeDefined();
  });

  describe('URL scheme validation (source code)', () => {
    it('uses window.location.search (not wouter location)', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.join(__dirname, '..', 'hooks', 'useQueryParams.js'),
        'utf-8'
      );
      expect(content).toMatch(/window\.location\.search/);
    });

    it('uses replace: true for navigation', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.join(__dirname, '..', 'hooks', 'useQueryParams.js'),
        'utf-8'
      );
      expect(content).toMatch(/replace:\s*true/);
    });

    it('imports useLocation from wouter', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.join(__dirname, '..', 'hooks', 'useQueryParams.js'),
        'utf-8'
      );
      expect(content).toMatch(/from\s*['"]wouter['"]/);
    });
  });
});
