import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...rest }) => (
      <div className={className} style={style} onClick={onClick}>
        {children}
      </div>
    ),
  },
}));

// Mock @use-gesture/react
vi.mock('@use-gesture/react', () => ({
  useDrag: () => () => ({}),
}));

// Mock stores
vi.mock('../stores/modalStore', () => {
  const store = { insightsDrawer: true, setInsightsDrawer: vi.fn() };
  return {
    useModalStore: vi.fn((selector) => selector(store)),
  };
});

vi.mock('../stores/poemStore', () => {
  const poem = {
    id: 1,
    poet: 'Nizar Qabbani',
    poetArabic: 'نزار قباني',
    title: 'My Beloved',
    titleArabic: 'حبيبتي',
    arabic: 'حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ',
    english: 'Your love, O woman of deep eyes',
  };
  const store = {
    isInterpreting: false,
    interpretation: 'some interpretation',
    currentPoem: () => poem,
  };
  return {
    usePoemStore: vi.fn((selector) => selector(store)),
  };
});

vi.mock('../stores/uiStore', () => {
  const store = { darkMode: true, ratchetMode: false };
  return {
    useUIStore: vi.fn((selector) => selector(store)),
  };
});

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
}));
global.IntersectionObserver = mockIntersectionObserver;

import InsightsDrawer from '../components/InsightsDrawer';

const defaultInsightParts = {
  poeticTranslation: 'Your love is radicalism and worship.',
  depth: 'The poem explores devotion through mystical love.',
  author: 'Nizar Qabbani was a Syrian diplomat and poet.',
};

describe('InsightsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIntersectionObserver.mockReturnValue({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    });
  });

  it('renders accessible sr-only heading', () => {
    render(<InsightsDrawer insightParts={defaultInsightParts} />);
    const heading = screen.getByRole('heading', { name: /poetic insight/i });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('sr-only');
  });

  it('renders Arabic poem title in header', () => {
    render(<InsightsDrawer insightParts={defaultInsightParts} />);
    expect(screen.getByText('حبيبتي')).toBeInTheDocument();
  });

  it('renders English poem title in header', () => {
    render(<InsightsDrawer insightParts={defaultInsightParts} />);
    expect(screen.getByText('My Beloved')).toBeInTheDocument();
  });

  it('renders sticky translation section', () => {
    render(<InsightsDrawer insightParts={defaultInsightParts} />);
    expect(screen.getByText('Your love is radicalism and worship.')).toBeInTheDocument();
    expect(screen.getByText(/translation/i)).toBeInTheDocument();
  });

  it('does not render translation section when poeticTranslation is absent', () => {
    render(<InsightsDrawer insightParts={{ depth: 'Some depth', author: 'Some author' }} />);
    expect(screen.queryByText(/translation/i)).not.toBeInTheDocument();
  });

  it('renders depth section', () => {
    render(<InsightsDrawer insightParts={defaultInsightParts} />);
    expect(screen.getByText('The Depth')).toBeInTheDocument();
    expect(screen.getByText('The poem explores devotion through mystical love.')).toBeInTheDocument();
  });

  it('renders author section', () => {
    render(<InsightsDrawer insightParts={defaultInsightParts} />);
    expect(screen.getByText('The Author')).toBeInTheDocument();
    expect(screen.getByText('Nizar Qabbani was a Syrian diplomat and poet.')).toBeInTheDocument();
  });

  it('renders gold rule divider when both depth and author are present', () => {
    const { container } = render(<InsightsDrawer insightParts={defaultInsightParts} />);
    const divider = container.querySelector('.h-px');
    expect(divider).toBeInTheDocument();
  });

  it('does not render divider when only depth is present', () => {
    const { container } = render(
      <InsightsDrawer insightParts={{ depth: 'Some depth' }} />
    );
    const divider = container.querySelector('.h-px');
    expect(divider).not.toBeInTheDocument();
  });

  it('renders close button', async () => {
    render(<InsightsDrawer insightParts={defaultInsightParts} />);
    const closeBtn = screen.getByRole('button');
    expect(closeBtn).toBeInTheDocument();
  });

  it('shows loading state when isInterpreting', () => {
    const { usePoemStore } = await import('../stores/poemStore');
    usePoemStore.mockImplementation((selector) =>
      selector({
        isInterpreting: true,
        interpretation: null,
        currentPoem: () => ({
          poet: 'Nizar Qabbani',
          poetArabic: 'نزار قباني',
          title: 'My Beloved',
          titleArabic: 'حبيبتي',
        }),
      })
    );
    render(<InsightsDrawer insightParts={null} />);
    expect(screen.getByText(/consulting diwan/i)).toBeInTheDocument();
  });

  it('shows empty state prompt when no interpretation yet', () => {
    const { usePoemStore } = await import('../stores/poemStore');
    usePoemStore.mockImplementation((selector) =>
      selector({
        isInterpreting: false,
        interpretation: null,
        currentPoem: () => ({
          poet: 'Nizar Qabbani',
          poetArabic: 'نزار قباني',
          title: 'My Beloved',
          titleArabic: 'حبيبتي',
        }),
      })
    );
    render(<InsightsDrawer insightParts={null} />);
    expect(screen.getByText(/tap the lightbulb/i)).toBeInTheDocument();
  });

  it('returns null when drawer is closed', () => {
    const { useModalStore } = await import('../stores/modalStore');
    useModalStore.mockImplementation((selector) =>
      selector({ insightsDrawer: false, setInsightsDrawer: vi.fn() })
    );
    const { container } = render(<InsightsDrawer insightParts={defaultInsightParts} />);
    expect(container.firstChild).toBeNull();
  });
});
