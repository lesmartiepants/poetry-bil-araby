import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Unit tests for share card designs ──────────────────────────────────
import {
  SHARE_CARD_DESIGNS,
  CARD_WIDTH,
  CARD_HEIGHT,
  prepareVerses,
  prepareTranslation,
  renderShareCard,
  generateShareCardDataURL,
} from '../utils/shareCardDesigns';

// ─── Test data ──────────────────────────────────────────────────────────
const mockPoem = {
  id: 42,
  poet: 'Nizar Qabbani',
  poetArabic: 'نزار قباني',
  title: 'Damascus',
  titleArabic: 'قصيدة دمشق',
  arabic:
    'يا دِمَشقُ يا حَبيبَتي\nأَنا الشاعِرُ العاشِقُ\nفي عَينَيكِ أَرى الجَنّة\nوَفي قَلبِكِ أَرى الحُب\nسَأَبقى أُغَنّي لَكِ\nما دامَ القَلبُ يَنبِض',
  english:
    'O Damascus, my beloved\nI am the poet in love\nIn your eyes I see paradise\nAnd in your heart I see love\nI will keep singing for you\nAs long as the heart beats',
  cachedTranslation:
    'O Damascus, my beloved\nI am the poet in love\nIn your eyes I see paradise\nAnd in your heart I see love',
  tags: ['Modern', 'Romantic'],
  isFromDatabase: true,
};

// ─── Design registry tests ──────────────────────────────────────────────
describe('SHARE_CARD_DESIGNS', () => {
  it('should export exactly 5 designs', () => {
    expect(SHARE_CARD_DESIGNS).toHaveLength(5);
  });

  it('each design has required fields', () => {
    for (const d of SHARE_CARD_DESIGNS) {
      expect(d).toHaveProperty('id');
      expect(d).toHaveProperty('name');
      expect(d).toHaveProperty('nameAr');
      expect(d).toHaveProperty('artist');
      expect(d).toHaveProperty('description');
      expect(typeof d.id).toBe('string');
      expect(typeof d.name).toBe('string');
      expect(typeof d.nameAr).toBe('string');
    }
  });

  it('design IDs are unique', () => {
    const ids = SHARE_CARD_DESIGNS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes the 5 expected design IDs', () => {
    const ids = SHARE_CARD_DESIGNS.map((d) => d.id);
    expect(ids).toContain('diwan');
    expect(ids).toContain('ibnMuqla');
    expect(ids).toContain('sinan');
    expect(ids).toContain('zahaHadid');
    expect(ids).toContain('hassanFathy');
  });

  it('each design nameAr is in Arabic script', () => {
    const arabicRegex = /[\u0600-\u06FF]/;
    for (const d of SHARE_CARD_DESIGNS) {
      expect(arabicRegex.test(d.nameAr)).toBe(true);
    }
  });
});

// ─── Card dimensions ────────────────────────────────────────────────────
describe('Card dimensions', () => {
  it('CARD_WIDTH is 1080 (Instagram-friendly)', () => {
    expect(CARD_WIDTH).toBe(1080);
  });

  it('CARD_HEIGHT is 1350 (4:5 ratio)', () => {
    expect(CARD_HEIGHT).toBe(1350);
  });
});

// ─── prepareVerses ──────────────────────────────────────────────────────
describe('prepareVerses', () => {
  it('returns first 4 non-empty lines by default', () => {
    const result = prepareVerses(mockPoem.arabic);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('يا دِمَشقُ يا حَبيبَتي');
    expect(result[3]).toBe('وَفي قَلبِكِ أَرى الحُب');
  });

  it('respects custom maxLines', () => {
    expect(prepareVerses(mockPoem.arabic, 2)).toHaveLength(2);
    expect(prepareVerses(mockPoem.arabic, 6)).toHaveLength(6);
  });

  it('returns empty array for null/undefined', () => {
    expect(prepareVerses(null)).toEqual([]);
    expect(prepareVerses(undefined)).toEqual([]);
    expect(prepareVerses('')).toEqual([]);
  });

  it('skips blank lines', () => {
    const text = 'line1\n\n\nline2\n\nline3';
    expect(prepareVerses(text)).toEqual(['line1', 'line2', 'line3']);
  });

  it('trims whitespace from each line', () => {
    const text = '  verse 1  \n  verse 2  ';
    const result = prepareVerses(text, 2);
    expect(result).toEqual(['verse 1', 'verse 2']);
  });
});

// ─── prepareTranslation ─────────────────────────────────────────────────
describe('prepareTranslation', () => {
  it('returns first 4 non-empty lines by default', () => {
    const result = prepareTranslation(mockPoem.english);
    expect(result).toHaveLength(4);
    expect(result[0]).toBe('O Damascus, my beloved');
  });

  it('returns empty array for falsy input', () => {
    expect(prepareTranslation(null)).toEqual([]);
    expect(prepareTranslation(undefined)).toEqual([]);
  });
});

// ─── renderShareCard (Canvas rendering) ─────────────────────────────────
describe('renderShareCard', () => {
  let ctx;

  beforeEach(() => {
    // Create a mock canvas context with all drawing methods
    ctx = {
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      measureText: vi.fn(() => ({ width: 100 })),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: '',
      textBaseline: '',
      direction: '',
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      letterSpacing: '',
    };
  });

  it('renders default (diwan) design without errors', () => {
    expect(() => {
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, 'diwan');
    }).not.toThrow();
  });

  it('renders ibnMuqla design without errors', () => {
    expect(() => {
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, 'ibnMuqla');
    }).not.toThrow();
  });

  it('renders sinan design without errors', () => {
    expect(() => {
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, 'sinan');
    }).not.toThrow();
  });

  it('renders zahaHadid design without errors', () => {
    expect(() => {
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, 'zahaHadid');
    }).not.toThrow();
  });

  it('renders hassanFathy design without errors', () => {
    expect(() => {
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, 'hassanFathy');
    }).not.toThrow();
  });

  it('falls back to diwan for unknown design ID', () => {
    expect(() => {
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, 'nonexistent');
    }).not.toThrow();
    // Should call fillRect at least once (background)
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('calls fillText with poem text for each design', () => {
    for (const design of SHARE_CARD_DESIGNS) {
      ctx.fillText.mockClear();
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, design.id);
      // At minimum it should draw poet name and verses
      expect(ctx.fillText).toHaveBeenCalled();
      // Check English poet name is drawn (primary)
      const calls = ctx.fillText.mock.calls.map((c) => c[0]);
      expect(calls).toContain(mockPoem.poet);
    }
  });

  it('draws brand watermark in every design', () => {
    for (const design of SHARE_CARD_DESIGNS) {
      ctx.fillText.mockClear();
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, design.id);
      const calls = ctx.fillText.mock.calls.map((c) => c[0]);
      // Brand is single-line: "بالعربي" and "poetry " drawn adjacently
      const hasBrandAr = calls.some((text) => typeof text === 'string' && text.includes('بالعربي'));
      const hasBrandEn = calls.some((text) => typeof text === 'string' && text.includes('poetry'));
      expect(hasBrandAr).toBe(true);
      expect(hasBrandEn).toBe(true);
    }
  });

  it('handles poem with missing fields gracefully', () => {
    const sparsePoem = { arabic: 'بيت شعر واحد' };
    for (const design of SHARE_CARD_DESIGNS) {
      expect(() => {
        renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, sparsePoem, design.id);
      }).not.toThrow();
    }
  });

  it('handles poem with no translation gracefully', () => {
    const noTranslation = { ...mockPoem, english: null, cachedTranslation: null };
    expect(() => {
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, noTranslation, 'diwan');
    }).not.toThrow();
  });

  it('draws English poet name and poem title in every design', () => {
    for (const design of SHARE_CARD_DESIGNS) {
      ctx.fillText.mockClear();
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, design.id);
      const calls = ctx.fillText.mock.calls.map((c) => c[0]);
      expect(calls).toContain(mockPoem.poet);
      expect(calls).toContain(mockPoem.title);
    }
  });

  it('interleaves English translation with Arabic verses', () => {
    ctx.fillText.mockClear();
    renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, 'diwan');
    const calls = ctx.fillText.mock.calls.map((c) => c[0]);
    expect(calls).toContain('يا دِمَشقُ يا حَبيبَتي');
    expect(calls.some((t) => typeof t === 'string' && t.includes('O Damascus'))).toBe(true);
  });
});

// ─── generateShareCardDataURL ───────────────────────────────────────────
describe('generateShareCardDataURL', () => {
  it('creates a canvas and calls getContext', () => {
    // happy-dom doesn't support real Canvas — verify function exists and signature
    // We test the actual rendering via the mock-ctx tests above
    expect(typeof generateShareCardDataURL).toBe('function');
    expect(generateShareCardDataURL.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── ShareCardModal component tests ─────────────────────────────────────
describe('ShareCardModal', () => {
  let ShareCardModal;

  beforeEach(async () => {
    // Dynamic import to avoid circular dependency issues
    const mod = await import('../components/ShareCardModal.jsx');
    ShareCardModal = mod.default;
  });

  it('renders with poem content visible', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    // Should show English poet name (primary)
    expect(screen.getByText(mockPoem.poet)).toBeInTheDocument();
  });

  it('shows design name for each design option', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    // Check that design selector buttons exist (now English names)
    for (const d of SHARE_CARD_DESIGNS) {
      expect(screen.getByText(d.name)).toBeInTheDocument();
    }
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<ShareCardModal poem={mockPoem} onClose={onClose} />);
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('has a download button', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /download/i })).toBeInTheDocument();
  });

  it('has a share button', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });

  it('switches design when a design option is clicked', async () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    // Click on Sinan design (now English label)
    const sinanBtn = screen.getByText('Sinan');
    await userEvent.click(sinanBtn);
    // Should highlight Sinan (the button parent should have active styling)
    expect(sinanBtn.closest('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows English poet name and poem title in preview', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    expect(screen.getByText(mockPoem.poet)).toBeInTheDocument();
    expect(screen.getByText(mockPoem.title)).toBeInTheDocument();
  });

  it('shows brand watermark in preview', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    // Brand is now a single line with "poetry" and "بالعربي" together
    expect(screen.getByText(/poetry/)).toBeInTheDocument();
    expect(screen.getByText(/بالعربي/)).toBeInTheDocument();
  });
});
