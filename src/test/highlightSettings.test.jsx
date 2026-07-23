import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextSettingsPill from '../components/TextSettingsPill';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';

// Reset uiStore before each test
beforeEach(() => {
  useUIStore.getState().reset();
});

describe('highlightStyle in uiStore', () => {
  it('initialises with highlightStyle "pill"', () => {
    expect(useUIStore.getState().highlightStyle).toBe('pill');
  });

  it('setHighlightStyle updates the value', () => {
    useUIStore.getState().setHighlightStyle('glow');
    expect(useUIStore.getState().highlightStyle).toBe('glow');
  });

  it('setHighlightStyle accepts all valid values', () => {
    const styles = ['none', 'glow', 'underline', 'pill', 'focus-blur'];
    for (const s of styles) {
      useUIStore.getState().setHighlightStyle(s);
      expect(useUIStore.getState().highlightStyle).toBe(s);
    }
  });

  it('reset returns highlightStyle to "pill"', () => {
    useUIStore.getState().setHighlightStyle('glow');
    useUIStore.getState().reset();
    expect(useUIStore.getState().highlightStyle).toBe('pill');
  });
});

describe('TextSettingsPill — Highlight selector', () => {
  // The panel is now opened from the account menu via the modalStore flag (no standalone trigger).
  beforeEach(() => {
    useModalStore.getState().setDisplaySettings(true);
  });

  it('renders the Read Along label', () => {
    render(<TextSettingsPill />);
    expect(screen.getByText(/read along/i)).toBeInTheDocument();
  });

  it('renders all 5 style buttons: Off, Glow, Line, Pill, Blur', () => {
    render(<TextSettingsPill />);
    expect(screen.getByRole('radio', { name: /off/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /glow/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /line/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /pill/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /blur/i })).toBeInTheDocument();
  });

  it('"Pill" button is active by default (highlightStyle is "pill")', () => {
    render(<TextSettingsPill />);
    const pillBtn = screen.getByRole('radio', { name: /pill/i });
    expect(pillBtn).toHaveAttribute('data-state', 'on');
  });

  it('clicking "Glow" sets highlightStyle to "glow" in uiStore', () => {
    render(<TextSettingsPill />);
    fireEvent.click(screen.getByRole('radio', { name: /glow/i }));
    expect(useUIStore.getState().highlightStyle).toBe('glow');
  });

  it('clicking "Pill" sets highlightStyle to "pill" in uiStore', () => {
    render(<TextSettingsPill />);
    fireEvent.click(screen.getByRole('radio', { name: /pill/i }));
    expect(useUIStore.getState().highlightStyle).toBe('pill');
  });

  it('active button has gold active styling (data-state="on")', () => {
    render(<TextSettingsPill />);
    fireEvent.click(screen.getByRole('radio', { name: /glow/i }));
    const glowBtn = screen.getByRole('radio', { name: /glow/i });
    expect(glowBtn).toHaveAttribute('data-state', 'on');
  });
});
