import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import InsightOverlay from '../components/InsightOverlay.jsx';

// Mock vaul
vi.mock('vaul', () => ({
  Drawer: {
    Root: ({ children, open, ...props }) => open ? <div data-testid="drawer-root">{children}</div> : null,
    Portal: ({ children }) => <div>{children}</div>,
    Overlay: (props) => <div data-testid="drawer-overlay" {...props} />,
    Content: ({ children, ...props }) => (
      <div data-testid="drawer-content" {...props}>
        {children}
      </div>
    ),
    Handle: (props) => <div data-testid="drawer-handle" {...props} />,
    Close: ({ children }) => children,
  },
}));

// Mock zustand store
vi.mock('../stores/uiStore', () => ({
  useUIStore: (selector) =>
    selector({
      darkMode: true,
      ratchetMode: false,
    }),
}));

const mockProps = {
  open: true,
  insightParts: {
    poeticTranslation: 'A poetic soul',
    depth: 'Deep meaning here',
    author: 'About the poet',
  },
  currentPoem: {
    title: 'Test Poem',
    titleArabic: 'قصيدة',
    poet: 'Test Poet',
    poetArabic: 'شاعر',
  },
  isInterpreting: false,
  interpretation: 'Some interpretation',
  onClose: vi.fn(),
  ratchetMode: false,
  handleAnalyze: vi.fn(),
};

describe('InsightOverlay', () => {
  it('renders heading and content sections', () => {
    render(<InsightOverlay {...mockProps} />);
    expect(screen.getByText('Poetic Insight')).toBeDefined();
    expect(screen.getByText('The Depth')).toBeDefined();
    expect(screen.getByText('The Author')).toBeDefined();
  });

  it('shows loading state when interpreting', () => {
    render(<InsightOverlay {...mockProps} isInterpreting={true} />);
    expect(screen.getByText(/Consulting/)).toBeDefined();
  });

  it('does not render when closed', () => {
    render(<InsightOverlay {...mockProps} open={false} />);
    expect(screen.queryByText('Poetic Insight')).toBeNull();
  });
});
