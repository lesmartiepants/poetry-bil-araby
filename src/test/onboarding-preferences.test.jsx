import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// The pickers read the taxonomy through services/database.js. Mock at that
// boundary so the adapter (services/categoryTags.js) runs for real.
vi.mock('../services/database.js', () => ({
  fetchCategories: vi.fn(async () => ({ dimensions: [], families: [] })),
  fetchPoemsByCategory: vi.fn(async () => []),
}));

import OnboardingFlow from '../components/onboarding/OnboardingFlow.jsx';
import PreferencesDrawer from '../components/PreferencesDrawer.jsx';
import {
  fetchTagTaxonomy,
  fetchDimensionValues,
  makeTagId,
  parseTagId,
  tagIdsToFilters,
  countPoemLabels,
} from '../services/categoryTags.js';
import { fetchCategories, fetchPoemsByCategory } from '../services/database.js';

const TAXONOMY = {
  dimensions: [
    {
      key: 'mood',
      label_ar: 'المزاج',
      label_en: 'Mood',
      cardinality: 2,
      values: [
        { key: 'joy', label_ar: 'فرح', label_en: 'Joy', poem_count: 5 },
        { key: 'grief', label_ar: 'حزن', label_en: 'Grief', poem_count: 3 },
      ],
    },
    {
      key: 'topic',
      label_ar: 'الموضوع',
      label_en: 'Topic',
      cardinality: 1,
      values: [{ key: 'sea', label_ar: 'البحر', label_en: 'Sea', poem_count: 9 }],
    },
  ],
  families: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  fetchCategories.mockResolvedValue({ dimensions: [], families: [] });
  fetchPoemsByCategory.mockResolvedValue([]);
});

describe('categoryTags adapter', () => {
  it('builds composite ids that round-trip', () => {
    expect(makeTagId('mood', 'joy')).toBe('mood:joy');
    expect(parseTagId('mood:joy')).toEqual({ dimension: 'mood', value: 'joy' });
    // Values may themselves contain a separator; only the first split counts.
    expect(parseTagId('mood:a:b')).toEqual({ dimension: 'mood', value: 'a:b' });
    expect(parseTagId('malformed')).toBeNull();
    expect(parseTagId(':leading')).toBeNull();
    expect(parseTagId(null)).toBeNull();
  });

  it('flattens dimensions into tag categories and tags', async () => {
    fetchCategories.mockResolvedValue(TAXONOMY);
    const { categories, tags } = await fetchTagTaxonomy();
    expect(categories.map((c) => c.slug)).toEqual(['mood', 'topic']);
    expect(categories[0]).toMatchObject({ name_ar: 'المزاج', name_en: 'Mood' });
    expect(tags.map((t) => t.id)).toEqual(['mood:joy', 'mood:grief', 'topic:sea']);
    expect(tags[0]).toMatchObject({
      category_slug: 'mood',
      name_ar: 'فرح',
      name_en: 'Joy',
      poem_count: 5,
    });
  });

  it('returns empty arrays pre-migration instead of throwing', async () => {
    const { categories, tags } = await fetchTagTaxonomy();
    expect(categories).toEqual([]);
    expect(tags).toEqual([]);
    expect(await fetchDimensionValues('mood')).toEqual([]);
  });

  it('reads a single dimension as picker options', async () => {
    fetchCategories.mockResolvedValue(TAXONOMY);
    const values = await fetchDimensionValues('mood');
    expect(values).toEqual([
      { slug: 'joy', name_ar: 'فرح', name_en: 'Joy', poem_count: 5 },
      { slug: 'grief', name_ar: 'حزن', name_en: 'Grief', poem_count: 3 },
    ]);
    expect(await fetchDimensionValues('nope')).toEqual([]);
  });

  it('groups tag ids into per-dimension by-category params', () => {
    const ids = ['mood:joy', 'mood:grief', 'topic:sea', 'garbage'];
    expect(tagIdsToFilters(ids, 'OR')).toEqual({ mood: 'joy,grief', topic: 'sea' });
    // AND only applies where a dimension has more than one selected value.
    expect(tagIdsToFilters(ids, 'AND')).toEqual({
      mood: 'joy,grief',
      moodMode: 'and',
      topic: 'sea',
    });
    expect(tagIdsToFilters([], 'OR')).toEqual({});
  });

  it('counts the labels on a by-category poem', () => {
    expect(countPoemLabels({ categories: { moods: ['joy'], topics: ['sea', 'war'] } })).toBe(3);
    expect(countPoemLabels({})).toBe(0);
    expect(countPoemLabels(null)).toBe(0);
  });
});

const FULL_TAXONOMY = {
  dimensions: [
    {
      key: 'mood',
      label_ar: 'المزاج',
      label_en: 'Mood',
      values: [
        { key: 'pride', label_ar: 'اعتزاز', label_en: 'Pride', poem_count: 1983 },
        { key: 'despair', label_ar: 'يأس', label_en: 'Despair', poem_count: 82 },
        { key: 'joy', label_ar: 'فرح', label_en: 'Joy', poem_count: 419 },
      ],
    },
    {
      key: 'motif',
      label_ar: 'الصورة',
      label_en: 'Motif',
      values: [
        { key: 'tears', label_ar: 'الدموع', label_en: 'Tears', poem_count: 1977 },
        { key: 'dawn', label_ar: 'الفجر والصبح', label_en: 'Dawn', poem_count: 287 },
      ],
    },
  ],
  families: [
    { key: 'love-desire', label_ar: 'الحب والهوى', label_en: 'Love & Desire', poem_count: 4554 },
    { key: 'grief-loss', label_ar: 'الأسى والفقد', label_en: 'Grief & Loss', poem_count: 3804 },
  ],
  distributions: {
    eras: [
      { century: 6, poem_count: 86 },
      { century: 9, poem_count: 649 },
      { century: 14, poem_count: 146 },
      { century: null, poem_count: 409 },
    ],
    accessibility: [
      { min: 1, max: 1.5, poem_count: 200 },
      { min: 2, max: 2.5, poem_count: 200 },
      { min: 4, max: 4.5, poem_count: 200 },
    ],
  },
};

describe('OnboardingFlow', () => {
  it('shows an empty state pre-migration instead of hanging or inventing options', async () => {
    render(<OnboardingFlow />);
    expect(await screen.findByTestId('onboarding-family-empty')).toBeTruthy();
    // Critically: no options are fabricated when the taxonomy is unavailable.
    expect(screen.queryAllByTestId('onboarding-family-option')).toHaveLength(0);
  });

  it('renders families from the live taxonomy, ordered by size and bilingual', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    render(<OnboardingFlow />);
    await waitFor(() => expect(screen.getAllByTestId('onboarding-family-option')).toHaveLength(2));
    const options = screen.getAllByTestId('onboarding-family-option');
    expect(options[0]).toHaveAttribute('data-option-key', 'love-desire');
    expect(options[0].textContent).toContain('الحب والهوى');
    expect(options[0].textContent).toContain('Love & Desire');
    // Counts are surfaced so the reader can see how big each shelf is.
    expect(options[0].textContent).toContain('4,554');
  });

  it('advances through all five steps, ending on difficulty', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);

    await screen.findAllByTestId('onboarding-family-option');
    fireEvent.click(screen.getAllByTestId('onboarding-family-option')[0]);
    fireEvent.click(screen.getByTestId('onboarding-family-continue'));

    await screen.findByTestId('onboarding-mood');
    fireEvent.click(screen.getByTestId('onboarding-mood-continue'));

    await screen.findByTestId('onboarding-motif');
    fireEvent.click(screen.getByTestId('onboarding-motif-continue'));

    await screen.findByTestId('onboarding-era');
    const eras = screen.getAllByTestId('onboarding-era-option');
    expect(eras.length).toBeGreaterThan(1);
    fireEvent.click(eras[0]);
    fireEvent.click(screen.getByTestId('onboarding-era-continue'));

    await screen.findByTestId('onboarding-difficulty');
    fireEvent.click(screen.getAllByTestId('onboarding-difficulty-option')[0]);
    fireEvent.click(screen.getByTestId('onboarding-difficulty-continue'));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const saved = onComplete.mock.calls[0][0];
    expect(saved.family).toBe('love-desire');
    expect(saved.difficulty).toBe('gentle');
    expect(saved.completedAt).toBeTruthy();
  });

  it('orders moods by poem count so the long tail sits at the end', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    render(<OnboardingFlow />);
    await screen.findAllByTestId('onboarding-family-option');
    fireEvent.click(screen.getByTestId('onboarding-family-continue'));
    await screen.findByTestId('onboarding-mood');
    const keys = screen
      .getAllByTestId('onboarding-mood-option')
      .map((el) => el.getAttribute('data-option-key'));
    // 1983 -> 419 -> 82. Nothing is dropped: the rare mood is still selectable,
    // because the answer is a weight and cannot strand the reader.
    expect(keys).toEqual(['pride', 'joy', 'despair']);
  });

  it('treats the motif step as optional', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    render(<OnboardingFlow />);
    await screen.findAllByTestId('onboarding-family-option');
    fireEvent.click(screen.getByTestId('onboarding-family-continue'));
    await screen.findByTestId('onboarding-mood');
    fireEvent.click(screen.getByTestId('onboarding-mood-continue'));
    const cta = await screen.findByTestId('onboarding-motif-continue');
    // Nothing selected, but the step is skippable at full opacity.
    expect(cta.textContent).toContain('تخطَّ');
  });

  // The constellation cannot physically hold mood's 16 chips or motif's 12 at
  // phone width: the outer ring's circumference is smaller than the chips laid
  // end to end, and because the chips are opaque the overflow reads as one
  // label painted over another rather than as crowding. Measured at 375px
  // before the fallback: 17 overlapping pairs on mood, 16 on motif, with
  // "Moon & Stars" sitting on top of "Tears". This pair of tests pins the
  // switch, since the ring geometry has already regressed once.
  const gotoMoodStep = async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    render(<OnboardingFlow />);
    await screen.findAllByTestId('onboarding-family-option');
    fireEvent.click(screen.getByTestId('onboarding-family-continue'));
    await screen.findByTestId('onboarding-mood');
    return screen.getAllByTestId('onboarding-mood-option');
  };

  const stubMatchMedia = (matches) => {
    const original = window.matchMedia;
    window.matchMedia = () => ({
      matches,
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    return () => {
      window.matchMedia = original;
    };
  };

  it('keeps the constellation when there is room for it', async () => {
    const restore = stubMatchMedia(false);
    try {
      const options = await gotoMoodStep();
      // Constellation nodes are placed by absolute left/top percentages.
      expect(options[0].style.position).toBe('absolute');
    } finally {
      restore();
    }
  });

  it('drops the constellation for rows at phone width', async () => {
    const restore = stubMatchMedia(true);
    try {
      const options = await gotoMoodStep();
      expect(options[0].style.position).not.toBe('absolute');
      // Every option survives the swap; this is a re-layout, not a truncation.
      expect(options).toHaveLength(3);
    } finally {
      restore();
    }
  });
});

describe('sampled bands', () => {
  // When the server predates the `distributions` payload, bands are cut from a
  // client-side sample. Proportions survive sampling; absolute counts do not —
  // "37" out of a 300-poem sample would read as 37 poems out of 84,000.
  const SAMPLE_PAGE = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    century: i < 20 ? 9 : i < 35 ? 6 : null,
    accessibilityScore: 1 + (i % 6) * 0.7,
  }));

  it('reports a share, not a count, when the histogram came from a sample', async () => {
    fetchCategories.mockResolvedValue({
      dimensions: FULL_TAXONOMY.dimensions,
      families: FULL_TAXONOMY.families,
      // No `distributions` — an older server.
    });
    fetchPoemsByCategory.mockResolvedValue(SAMPLE_PAGE);

    const { fetchCategoryBands } = await import('../services/categoryBands.js');
    const { eraBands, difficultyBands } = await fetchCategoryBands();

    expect(eraBands.length).toBeGreaterThan(0);
    for (const b of [...eraBands, ...difficultyBands]) {
      expect(b.estimated).toBe(true);
      expect(b.poem_count).toBeUndefined();
      expect(b.share).toBeGreaterThan(0);
      expect(b.share).toBeLessThanOrEqual(1);
    }
    const total = eraBands.reduce((n, b) => n + b.share, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('keeps exact counts when the server measured them', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    const { fetchCategoryBands } = await import('../services/categoryBands.js');
    const { eraBands } = await fetchCategoryBands();

    for (const b of eraBands) {
      expect(b.estimated).toBe(false);
      expect(b.poem_count).toBeGreaterThan(0);
    }
    // Server-measured: no sampling requests at all.
    expect(fetchPoemsByCategory).not.toHaveBeenCalled();
  });
});

describe('PreferencesDrawer', () => {
  it('renders a section per preference when open', async () => {
    render(<PreferencesDrawer isOpen onClose={() => {}} />);
    expect(await screen.findByTestId('preferences-drawer')).toBeTruthy();
    for (const id of ['family', 'mood', 'motif', 'era', 'difficulty']) {
      expect(screen.getByTestId(`prefs-edit-${id}`)).toBeTruthy();
    }
  });

  it('renders nothing when closed', () => {
    render(<PreferencesDrawer isOpen={false} onClose={() => {}} />);
    expect(screen.queryByTestId('preferences-drawer')).toBeNull();
  });
});
