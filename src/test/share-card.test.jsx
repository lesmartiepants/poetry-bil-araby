import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Unit tests for share card designs ──────────────────────────────────
import {
  SHARE_CARD_DESIGNS,
  CARD_WIDTH,
  CARD_HEIGHT,
  MIN_BILINGUAL_GAP,
  createBilingualVerseLayout,
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
  it('should export exactly 12 designs', () => {
    expect(SHARE_CARD_DESIGNS).toHaveLength(12);
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

  it('includes the artist, atmosphere, and composition design IDs', () => {
    const ids = SHARE_CARD_DESIGNS.map((d) => d.id);
    for (const id of [
      'diwan',
      'ibnMuqla',
      'sinan',
      'zahaHadid',
      'hassanFathy',
      'layl',
      'mishkat',
      'sahifa',
      'musnad',
      'muqabala',
      'najma',
      'iqtibas',
    ]) {
      expect(ids).toContain(id);
    }
  });

  it('no longer includes the removed neon design', () => {
    const ids = SHARE_CARD_DESIGNS.map((d) => d.id);
    expect(ids).not.toContain('neon');
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
      ellipse: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      setLineDash: vi.fn(),
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

  it('draws the poet name and verses for each design', () => {
    for (const design of SHARE_CARD_DESIGNS) {
      ctx.fillText.mockClear();
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, design.id);
      expect(ctx.fillText).toHaveBeenCalled();
      const calls = ctx.fillText.mock.calls.map((c) => c[0]);
      // Every design draws the Arabic poet name and the opening verse
      const hasPoet = calls.some(
        (text) => typeof text === 'string' && text.includes(mockPoem.poetArabic)
      );
      const hasVerse = calls.some(
        (text) => typeof text === 'string' && text.includes('يا دِمَشقُ')
      );
      expect(hasPoet).toBe(true);
      expect(hasVerse).toBe(true);
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

  it('handles double-Arabic poet/title without duplicating', () => {
    // Simulate DB without English columns: poet and poetArabic are both Arabic
    const arabicOnlyPoem = {
      ...mockPoem,
      poet: 'نزار قباني',
      poetArabic: 'نزار قباني',
      title: 'يا دمشق',
      titleArabic: 'يا دمشق',
    };
    for (const design of SHARE_CARD_DESIGNS) {
      ctx.fillText.mockClear();
      expect(() => {
        renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, arabicOnlyPoem, design.id);
      }).not.toThrow();
      const calls = ctx.fillText.mock.calls.map((c) => c[0]);
      // Should render poet name once (not duplicate)
      const poetOccurrences = calls.filter((t) => t === 'نزار قباني').length;
      expect(poetOccurrences).toBe(1);
    }
  });

  it('draws the English poet name and title in the bilingual-header designs', () => {
    // These designs use the shared bilingual header, which renders an English
    // "[author] – [title]" summary. Sahifa now uses a custom header (English
    // title only, in red) and the composition layouts are Arabic-forward, so
    // they are checked separately below.
    const HEADER_DESIGNS = [
      'diwan',
      'ibnMuqla',
      'sinan',
      'zahaHadid',
      'hassanFathy',
      'layl',
      'mishkat',
    ];
    for (const id of HEADER_DESIGNS) {
      ctx.fillText.mockClear();
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, id);
      const calls = ctx.fillText.mock.calls.map((c) => c[0]);
      const hasEnglishPoet = calls.some(
        (text) => typeof text === 'string' && text.includes(mockPoem.poet)
      );
      const hasTitle = calls.some(
        (text) => typeof text === 'string' && text.includes(mockPoem.title)
      );
      expect(hasEnglishPoet).toBe(true);
      expect(hasTitle).toBe(true);
    }
  });

  it('draws the English title on the composition and broadsheet designs', () => {
    // Sahifa + the composition layouts each surface the English title.
    for (const id of ['sahifa', 'musnad', 'muqabala', 'najma', 'iqtibas']) {
      ctx.fillText.mockClear();
      renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, id);
      const calls = ctx.fillText.mock.calls.map((c) => c[0]);
      const hasTitle = calls.some(
        (text) => typeof text === 'string' && text.includes(mockPoem.title)
      );
      expect(hasTitle).toBe(true);
    }
  });

  it('interleaves English translation with Arabic verses', () => {
    ctx.fillText.mockClear();
    renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, mockPoem, 'diwan');
    const calls = ctx.fillText.mock.calls.map((c) => c[0]);
    expect(calls).toContain('يا دِمَشقُ يا حَبيبَتي');
    expect(calls.some((t) => typeof t === 'string' && t.includes('O Damascus'))).toBe(true);
  });

  it('keeps fully vocalized six-line Arabic verses clear of English text', () => {
    const arabicAscent = 32;
    const arabicDescent = 9;
    ctx.measureText.mockImplementation(() => ({
      width: 100,
      actualBoundingBoxAscent: arabicAscent,
      actualBoundingBoxDescent: arabicDescent,
    }));
    const vocalizedPoem = {
      ...mockPoem,
      arabic:
        'إِنَّ الحَيَاةَ دَقِيقَةٌ\nفَاجْعَلْهَا نُورًا وَسَكِينَةً\nوَاخْتَرْ لِقَلْبِكَ مَوْعِدًا\nيُحْيِي الرُّوحَ وَيُطْمَئِنُهَا\nفَكُلُّ دَرْبٍ فِي المَدَى\nيَبْدَأُ بِخُطْوَةٍ أَمِينَةٍ',
    };
    const verses = prepareVerses(vocalizedPoem.arabic, 6);
    const translation = prepareTranslation(vocalizedPoem.english, 6);
    const layout = createBilingualVerseLayout(ctx, verses, translation, {
      maxWidth: 800,
      maxHeight: 500,
      arabicSize: 42,
      englishSize: 27,
      preferredRowGap: 96,
    });

    expect(layout.translationOffset - arabicDescent - arabicAscent).toBeGreaterThanOrEqual(
      MIN_BILINGUAL_GAP
    );
    expect(layout.rowGap - (layout.translationOffset + arabicDescent) - arabicAscent).toBeGreaterThanOrEqual(
      MIN_BILINGUAL_GAP
    );
    for (const design of SHARE_CARD_DESIGNS) {
      expect(() => renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, vocalizedPoem, design.id, { maxLines: 6 })).not.toThrow();
    }
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

  it('renders the WYSIWYG canvas preview image (Folio 3.4B)', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    // Preview is the actual canvas render — same pixels as the export
    const preview = screen.getByAltText('Share card preview');
    expect(preview.tagName).toBe('IMG');
    expect(preview.closest('figure')).toHaveAttribute('data-style', 'diwan');
  });

  it('shows an arch radio for each design option', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    // The arcade is a radiogroup of nameless arches (aria-label carries the name)
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(SHARE_CARD_DESIGNS.length);
    for (const d of SHARE_CARD_DESIGNS) {
      expect(screen.getByRole('radio', { name: `${d.name} style` })).toBeInTheDocument();
    }
  });

  it('shows the material caption for the active design', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    // Dīwān is active by default — caption describes the material, not the name
    expect(screen.getByText('gold foil on obsidian')).toBeInTheDocument();
  });

  it('renders the typed dedication header', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    expect(screen.getByText('Send this poem')).toBeInTheDocument();
    expect(screen.getByText('شارِك')).toBeInTheDocument();
    expect(
      screen.getByLabelText('to a friend, to a lover, to a stranger, to yourself')
    ).toBeInTheDocument();
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

  it('has a copy-link button', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /copy link/i })).toBeInTheDocument();
  });

  it('switches design when an arch is clicked (after the dissolve)', async () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    const sinanArch = screen.getByRole('radio', { name: 'Sinan style' });
    await userEvent.click(sinanArch);
    // The card dissolves for 300ms before the new style lands
    await waitFor(() => {
      expect(sinanArch).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByAltText('Share card preview').closest('figure')).toHaveAttribute(
        'data-style',
        'sinan'
      );
    });
    // Caption swaps to the new material description
    expect(screen.getByText('celestial geometry')).toBeInTheDocument();
  });

  it('opens the lines panel with a row per verse line', async () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /choose lines/i }));
    // One checkbox row per Arabic line (mock poem has 6)
    const rows = screen.getAllByRole('checkbox');
    expect(rows).toHaveLength(6);
    // First four lines selected by default
    expect(rows[0]).toHaveAttribute('aria-checked', 'true');
    expect(rows[3]).toHaveAttribute('aria-checked', 'true');
    expect(rows[4]).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('4 of 6 lines')).toBeInTheDocument();
    // Alignment controls live in the panel
    expect(screen.getByRole('button', { name: /align center/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /align right/i })).toBeInTheDocument();
  });

  it('toggles a line selection and updates the count', async () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /choose lines/i }));
    const rows = screen.getAllByRole('checkbox');
    await userEvent.click(rows[4]);
    expect(rows[4]).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('5 of 6 lines')).toBeInTheDocument();
    await userEvent.click(rows[0]);
    expect(rows[0]).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('4 of 6 lines')).toBeInTheDocument();
  });

  it('never allows unselecting the last remaining line', async () => {
    const onePair = { ...mockPoem, arabic: 'بيت واحد', english: 'one line' };
    render(<ShareCardModal poem={onePair} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /choose lines/i }));
    const row = screen.getByRole('checkbox');
    await userEvent.click(row);
    expect(row).toHaveAttribute('aria-checked', 'true');
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Keep at least one line');
    });
  });

  it('sets alignment via the panel controls', async () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /choose lines/i }));
    const rightBtn = screen.getByRole('button', { name: /align right/i });
    await userEvent.click(rightBtn);
    expect(rightBtn).toHaveAttribute('aria-pressed', 'true');
    // Clicking again returns to the design default (neither pressed)
    await userEvent.click(rightBtn);
    expect(rightBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('closes the panel with Done and restores the dock', async () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /choose lines/i }));
    expect(screen.queryByRole('button', { name: /^share$/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /done/i }));
    expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument();
  });

  it('copies the poem link and shows a toast', async () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: /copy link/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      `${window.location.origin}/poem/${mockPoem.id}`
    );
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Link copied');
    });
  });

  it('keeps a hidden canvas for PNG generation', () => {
    render(<ShareCardModal poem={mockPoem} onClose={() => {}} />);
    const hiddenCanvas = document.querySelector('canvas[aria-hidden="true"]');
    expect(hiddenCanvas).toBeInTheDocument();
  });
});
