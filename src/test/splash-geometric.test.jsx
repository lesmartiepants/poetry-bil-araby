import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SplashGeometric } from '../splash-options/splash-geometric.jsx';

describe('SplashGeometric', () => {
  it('renders without crashing', () => {
    const mockGetStarted = vi.fn();
    const mockToggleTheme = vi.fn();

    render(
      <SplashGeometric
        onGetStarted={mockGetStarted}
        darkMode={true}
        onToggleTheme={mockToggleTheme}
      />
    );

    // Check for main brand text
    expect(screen.getByText('بالعربي')).toBeInTheDocument();
    expect(screen.getByText('poetry')).toBeInTheDocument();
  });

  it('renders headline text', () => {
    const mockGetStarted = vi.fn();
    const mockToggleTheme = vi.fn();

    const { container } = render(
      <SplashGeometric
        onGetStarted={mockGetStarted}
        darkMode={true}
        onToggleTheme={mockToggleTheme}
      />
    );

    // Check for geometric poetry theme headline elements
    expect(screen.getByText('Mathematics')).toBeInTheDocument();
    expect(container.textContent).toContain('Where');
    expect(container.textContent).toContain('Meets');
  });

  it('renders call to action button', () => {
    const mockGetStarted = vi.fn();
    const mockToggleTheme = vi.fn();

    render(
      <SplashGeometric
        onGetStarted={mockGetStarted}
        darkMode={true}
        onToggleTheme={mockToggleTheme}
      />
    );

    expect(screen.getByText('Enter the Form')).toBeInTheDocument();
    expect(screen.getByText('ادخل الشكل')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    const mockGetStarted = vi.fn();
    const mockToggleTheme = vi.fn();

    render(
      <SplashGeometric
        onGetStarted={mockGetStarted}
        darkMode={true}
        onToggleTheme={mockToggleTheme}
      />
    );

    const themeToggle = screen.getByLabelText('Switch to light mode');
    expect(themeToggle).toBeInTheDocument();
  });

  it('adapts to light mode', () => {
    const mockGetStarted = vi.fn();
    const mockToggleTheme = vi.fn();

    render(
      <SplashGeometric
        onGetStarted={mockGetStarted}
        darkMode={false}
        onToggleTheme={mockToggleTheme}
      />
    );

    const themeToggle = screen.getByLabelText('Switch to dark mode');
    expect(themeToggle).toBeInTheDocument();
  });

  it('includes animated SVG geometric patterns', () => {
    const mockGetStarted = vi.fn();
    const mockToggleTheme = vi.fn();

    const { container } = render(
      <SplashGeometric
        onGetStarted={mockGetStarted}
        darkMode={true}
        onToggleTheme={mockToggleTheme}
      />
    );

    // Check for SVG elements
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('includes CSS animations', () => {
    const mockGetStarted = vi.fn();
    const mockToggleTheme = vi.fn();

    const { container } = render(
      <SplashGeometric
        onGetStarted={mockGetStarted}
        darkMode={true}
        onToggleTheme={mockToggleTheme}
      />
    );

    // Check for style tag with animations
    const styleTag = container.querySelector('style');
    expect(styleTag).toBeInTheDocument();
    expect(styleTag.textContent).toContain('@keyframes');
    expect(styleTag.textContent).toContain('rotate');
    expect(styleTag.textContent).toContain('pulse');
    expect(styleTag.textContent).toContain('morph');
  });
});
