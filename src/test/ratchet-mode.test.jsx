import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../stores/uiStore';

// ============================================================================
// Ratchet Mode — Store Tests
// ============================================================================
describe('ratchetMode store', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  it('starts with ratchetMode off', () => {
    expect(useUIStore.getState().ratchetMode).toBe(false);
  });

  it('toggleRatchetMode flips the flag', () => {
    useUIStore.getState().toggleRatchetMode();
    expect(useUIStore.getState().ratchetMode).toBe(true);
    useUIStore.getState().toggleRatchetMode();
    expect(useUIStore.getState().ratchetMode).toBe(false);
  });

  it('setRatchetMode sets to specific value', () => {
    useUIStore.getState().setRatchetMode(true);
    expect(useUIStore.getState().ratchetMode).toBe(true);
    useUIStore.getState().setRatchetMode(false);
    expect(useUIStore.getState().ratchetMode).toBe(false);
  });

  it('reset restores ratchetMode to false', () => {
    useUIStore.getState().setRatchetMode(true);
    useUIStore.getState().reset();
    expect(useUIStore.getState().ratchetMode).toBe(false);
  });

  it('toggling ratchetMode multiple times in sequence works correctly', () => {
    const store = useUIStore.getState();
    store.toggleRatchetMode(); // true
    store.toggleRatchetMode(); // false
    store.toggleRatchetMode(); // true
    expect(useUIStore.getState().ratchetMode).toBe(true);
  });

  it('ratchetMode is independent of other settings', () => {
    useUIStore.getState().setRatchetMode(true);
    useUIStore.getState().toggleDarkMode();
    useUIStore.getState().cycleFont();
    expect(useUIStore.getState().ratchetMode).toBe(true);
    expect(useUIStore.getState().darkMode).toBe(false);
  });
});

// ============================================================================
// Ratchet Mode — UI Integration Tests
// ============================================================================
describe('ratchetMode UI integration', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  it('provides Flame icon button in settings with correct title', async () => {
    // This test verifies the VerticalSidebar renders a ratchet mode toggle
    // We test via the store + DiwanApp integration since VerticalSidebar
    // is rendered inside DiwanApp
    const { default: DiwanApp } = await import('../app.jsx');
    render(<DiwanApp />);

    // Open sidebar
    const settingsBtn = screen.getByTitle('Settings');
    await userEvent.click(settingsBtn);

    // The ratchet toggle should appear in settings drawer
    const ratchetBtn = screen.getByTitle('Enable ratchet mode');
    expect(ratchetBtn).toBeTruthy();
  });

  it('toggles ratchet mode on click and updates title', async () => {
    const { default: DiwanApp } = await import('../app.jsx');
    render(<DiwanApp />);

    // Open sidebar settings
    const settingsBtn = screen.getByTitle('Settings');
    await userEvent.click(settingsBtn);

    // Click ratchet toggle
    const ratchetBtn = screen.getByTitle('Enable ratchet mode');
    await userEvent.click(ratchetBtn);

    // Store should reflect the change
    expect(useUIStore.getState().ratchetMode).toBe(true);

    // Title should now say disable
    await waitFor(() => {
      expect(screen.getByTitle('Disable ratchet mode')).toBeTruthy();
    });
  });

  it('shows full-screen glow overlay when ratchet mode is active', async () => {
    const { default: DiwanApp } = await import('../app.jsx');
    render(<DiwanApp />);

    // Glow overlay should NOT be present initially
    expect(document.querySelector('[data-testid="ratchet-glow-overlay"]')).toBeNull();

    // Enable ratchet mode via store
    useUIStore.getState().setRatchetMode(true);

    // Glow overlay should appear
    await waitFor(() => {
      const overlay = document.querySelector('[data-testid="ratchet-glow-overlay"]');
      expect(overlay).toBeTruthy();
    });
  });

  it('removes glow overlay when ratchet mode is deactivated', async () => {
    const { default: DiwanApp } = await import('../app.jsx');
    render(<DiwanApp />);

    // Enable then disable
    useUIStore.getState().setRatchetMode(true);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="ratchet-glow-overlay"]')).toBeTruthy();
    });

    useUIStore.getState().setRatchetMode(false);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="ratchet-glow-overlay"]')).toBeNull();
    });
  });

  it('glow overlay has pointer-events-none (does not block interaction)', async () => {
    const { default: DiwanApp } = await import('../app.jsx');
    render(<DiwanApp />);

    useUIStore.getState().setRatchetMode(true);

    await waitFor(() => {
      const overlay = document.querySelector('[data-testid="ratchet-glow-overlay"]');
      expect(overlay).toBeTruthy();
      expect(overlay.className).toContain('pointer-events-none');
    });
  });

  it('full sequence: enable → verify glow → toggle off → verify no glow → re-enable → verify glow', async () => {
    const { default: DiwanApp } = await import('../app.jsx');
    render(<DiwanApp />);

    // Enable
    useUIStore.getState().setRatchetMode(true);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="ratchet-glow-overlay"]')).toBeTruthy();
    });

    // Disable
    useUIStore.getState().setRatchetMode(false);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="ratchet-glow-overlay"]')).toBeNull();
    });

    // Re-enable
    useUIStore.getState().setRatchetMode(true);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="ratchet-glow-overlay"]')).toBeTruthy();
    });
  });
});

// ============================================================================
// Ratchet Mode — Prompt Tests
// ============================================================================
describe('ratchetMode prompt', () => {
  it('RATCHET_SYSTEM_PROMPT is exported and non-empty', async () => {
    const { RATCHET_SYSTEM_PROMPT } = await import('../prompts');
    expect(RATCHET_SYSTEM_PROMPT).toBeDefined();
    expect(typeof RATCHET_SYSTEM_PROMPT).toBe('string');
    expect(RATCHET_SYSTEM_PROMPT.length).toBeGreaterThan(50);
  });

  it('RATCHET_SYSTEM_PROMPT contains Gen Z language markers', async () => {
    const { RATCHET_SYSTEM_PROMPT } = await import('../prompts');
    // Should include slang indicators
    const hasSlang = /no cap|fr fr|hits different|bussin|lowkey|highkey|slay/i.test(
      RATCHET_SYSTEM_PROMPT
    );
    expect(hasSlang).toBe(true);
  });

  it('RATCHET_SYSTEM_PROMPT maintains the POEM/DEPTH/AUTHOR structure', async () => {
    const { RATCHET_SYSTEM_PROMPT } = await import('../prompts');
    expect(RATCHET_SYSTEM_PROMPT).toContain('POEM:');
    expect(RATCHET_SYSTEM_PROMPT).toContain('THE DEPTH:');
    expect(RATCHET_SYSTEM_PROMPT).toContain('THE AUTHOR:');
  });
});
