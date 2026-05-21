import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TextSettingsPill from '../components/TextSettingsPill';
import { useUIStore } from '../stores/uiStore';

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

describe('TextSettingsPill — Row 5 Highlight selector', () => {
  it('renders the Highlight label', () => {
    render(<TextSettingsPill />);
    // Open the popover by clicking the trigger
    fireEvent.click(screen.getByRole('button', { name: /text.*settings/i }));
    expect(screen.getByText(/highlight/i)).toBeInTheDocument();
  });

  it('renders all 5 style buttons: Off, Glow, Line, Pill, Blur', () => {
    render(<TextSettingsPill />);
    fireEvent.click(screen.getByRole('button', { name: /text.*settings/i }));
    expect(screen.getByRole('radio', { name: /off/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /glow/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /line/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /pill/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /blur/i })).toBeInTheDocument();
  });

  it('"Pill" button is active by default (highlightStyle is "pill")', () => {
    render(<TextSettingsPill />);
    fireEvent.click(screen.getByRole('button', { name: /text.*settings/i }));
    const pillBtn = screen.getByRole('radio', { name: /pill/i });
    expect(pillBtn).toHaveAttribute('data-state', 'on');
  });

  it('clicking "Glow" sets highlightStyle to "glow" in uiStore', () => {
    render(<TextSettingsPill />);
    fireEvent.click(screen.getByRole('button', { name: /text.*settings/i }));
    fireEvent.click(screen.getByRole('radio', { name: /glow/i }));
    expect(useUIStore.getState().highlightStyle).toBe('glow');
  });

  it('clicking "Pill" sets highlightStyle to "pill" in uiStore', () => {
    render(<TextSettingsPill />);
    fireEvent.click(screen.getByRole('button', { name: /text.*settings/i }));
    fireEvent.click(screen.getByRole('radio', { name: /pill/i }));
    expect(useUIStore.getState().highlightStyle).toBe('pill');
  });

  it('active button has gold active styling (data-state="on")', () => {
    render(<TextSettingsPill />);
    fireEvent.click(screen.getByRole('button', { name: /text.*settings/i }));
    fireEvent.click(screen.getByRole('radio', { name: /glow/i }));
    const glowBtn = screen.getByRole('radio', { name: /glow/i });
    expect(glowBtn).toHaveAttribute('data-state', 'on');
  });
});
