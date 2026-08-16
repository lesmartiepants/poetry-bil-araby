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
import { useUIStore } from '../stores/uiStore.js';

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
  /**
   * Every step sits behind the welcome screen, and both of the welcome's doors
   * are locked until "I read poems…" is answered — so opening the flow is two
   * taps, not one.
   */
  const openDoors = async () => {
    const [posture] = await screen.findAllByTestId('onboarding-welcome-posture-option');
    fireEvent.click(posture);
  };

  const enterFlow = async () => {
    render(<OnboardingFlow />);
    await openDoors();
    fireEvent.click(await screen.findByTestId('onboarding-welcome-continue'));
    return screen.findByTestId('onboarding-mood');
  };

  // The welcome asks how you read FIRST, and both doors stay shut until it is
  // answered. Without this the language answer scrolled past unread, because a
  // reader who has already decided to continue never looks below the CTA.
  it('keeps both welcome doors locked until the reading posture is answered', async () => {
    render(<OnboardingFlow />);
    const curate = await screen.findByTestId('onboarding-welcome-continue');
    const justRead = screen.getByTestId('onboarding-welcome-skip-all');
    expect(curate.disabled).toBe(true);
    expect(justRead.disabled).toBe(true);

    await openDoors();
    expect(screen.getByTestId('onboarding-welcome-continue').disabled).toBe(false);
    expect(screen.getByTestId('onboarding-welcome-skip-all').disabled).toBe(false);
  });

  // The answer is persisted, so a returning reader has one. It still must not
  // be pre-filled here: the doors would open for a question they never saw.
  it('lands unanswered even when a posture is already stored', async () => {
    useUIStore.getState().setReadingPosture('english');
    render(<OnboardingFlow />);
    const chips = await screen.findAllByTestId('onboarding-welcome-posture-option');
    for (const chip of chips) expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('onboarding-welcome-continue').disabled).toBe(true);
  });

  it('shows an empty state pre-migration instead of hanging or inventing options', async () => {
    await enterFlow();
    expect(await screen.findByTestId('onboarding-mood-empty')).toBeTruthy();
    // Critically: no options are fabricated when the taxonomy is unavailable.
    expect(screen.queryAllByTestId('onboarding-mood-option')).toHaveLength(0);
  });

  it('renders families from the live taxonomy, bilingual and WITHOUT counts', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    render(<OnboardingFlow />);
    await openDoors();
    fireEvent.click(await screen.findByTestId('onboarding-welcome-continue'));
    fireEvent.click(await screen.findByTestId('onboarding-mood-continue'));
    fireEvent.click(await screen.findByTestId('onboarding-motif-continue'));
    await screen.findByTestId('onboarding-family');
    const options = screen.getAllByTestId('onboarding-family-option');
    expect(options).toHaveLength(2);
    // Both languages on the tile, English first, and neither one a caption for
    // the other.
    expect(options[0].textContent).toContain('الحب والهوى');
    expect(options[0].textContent).toContain('Love & Desire');
    expect(options[0].getAttribute('aria-label')).toContain('Love & Desire');

    // The answers weight the feed rather than filtering it, so a poem count
    // beside an option describes a narrowing that never happens. None of the
    // fixture's counts may reach the screen, in either language.
    for (const option of options) {
      expect(option.textContent).not.toMatch(/[0-9]/);
      expect(option.getAttribute('aria-label')).not.toMatch(/[0-9]/);
    }
  });

  it('advances through all six steps in order, ending on era', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);

    await openDoors();
    fireEvent.click(await screen.findByTestId('onboarding-welcome-continue'));

    await screen.findByTestId('onboarding-mood');
    fireEvent.click(screen.getAllByTestId('onboarding-mood-option')[0]);
    fireEvent.click(screen.getByTestId('onboarding-mood-continue'));

    await screen.findByTestId('onboarding-motif');
    fireEvent.click(screen.getByTestId('onboarding-motif-continue'));

    await screen.findByTestId('onboarding-family');
    fireEvent.click(screen.getAllByTestId('onboarding-family-option')[0]);
    fireEvent.click(screen.getByTestId('onboarding-family-continue'));

    await screen.findByTestId('onboarding-difficulty');
    fireEvent.click(screen.getAllByTestId('onboarding-difficulty-option')[0]);
    fireEvent.click(screen.getByTestId('onboarding-difficulty-continue'));

    await screen.findByTestId('onboarding-era');
    const eras = screen.getAllByTestId('onboarding-era-option');
    expect(eras.length).toBeGreaterThan(1);
    fireEvent.click(eras[0]);
    fireEvent.click(screen.getByTestId('onboarding-era-continue'));

    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    const saved = onComplete.mock.calls[0][0];
    expect(saved.family).toBe('love-desire');
    // Difficulty and era are multi-select, so both store arrays.
    expect(saved.difficulty).toEqual(['gentle']);
    expect(saved.moods).toHaveLength(1);
    expect(saved.era.length).toBeGreaterThan(0);
    expect(saved.completedAt).toBeTruthy();
  });

  it('leaves without recording an answer when the reader chooses to just read', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    const onComplete = vi.fn();
    render(<OnboardingFlow onComplete={onComplete} />);
    await openDoors();
    fireEvent.click(await screen.findByTestId('onboarding-welcome-skip-all'));
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    // No completedAt: declining to answer is not a finished answer, and
    // stamping one would make the feed treat an empty set as a choice.
    expect(onComplete.mock.calls[0][0].completedAt).toBeFalsy();
  });

  it('orders moods by feeling rather than by corpus size', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    await enterFlow();
    const keys = screen
      .getAllByTestId('onboarding-mood-option')
      .map((el) => el.getAttribute('data-option-key'));
    // Fixture counts are pride 1983 > joy 419 > despair 82. The screen no
    // longer shows counts, so count order would read as arbitrary; the field is
    // grouped heavy -> bright -> upright instead.
    expect(keys).toEqual(['despair', 'joy', 'pride']);
  });

  it('treats the motif step as optional', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    await enterFlow();
    fireEvent.click(screen.getByTestId('onboarding-mood-continue'));
    const cta = await screen.findByTestId('onboarding-motif-continue');
    // Nothing selected, so the advance offers to skip.
    expect(cta.textContent).toContain('تخط');
  });

  // A single-select step with no way to un-choose traps a reader who changed
  // their mind: every step is skippable, but once a family was picked the only
  // escape was reloading the flow. Re-tapping the chosen option clears it.
  it('clears a single-select answer when the chosen option is tapped again', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    render(<OnboardingFlow />);
    await openDoors();
    fireEvent.click(await screen.findByTestId('onboarding-welcome-continue'));
    fireEvent.click(await screen.findByTestId('onboarding-mood-continue'));
    fireEvent.click(await screen.findByTestId('onboarding-motif-continue'));
    await screen.findByTestId('onboarding-family');

    const first = screen.getAllByTestId('onboarding-family-option')[0];
    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('onboarding-family-continue').textContent).toContain('التالي');

    fireEvent.click(first);
    expect(first).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('onboarding-family-continue').textContent).toContain('تخط');
  });

  // The language question rides on the welcome screen rather than a seventh
  // step. It sets what the READER shows, so it is stored in the UI store and
  // not in onboardingPrefs — the prefs payload is a taste profile that the feed
  // and the draw inspector both read by shape.
  describe('reading posture', () => {
    beforeEach(() => {
      useUIStore.getState().setReadingPosture(null);
    });

    it('sets the reading aids from the answer', async () => {
      render(<OnboardingFlow />);
      await screen.findByTestId('onboarding-welcome-posture');

      const pick = (key) =>
        fireEvent.click(
          screen
            .getAllByTestId('onboarding-welcome-posture-option')
            .find((b) => b.getAttribute('data-posture') === key)
        );

      // English-first gets BOTH rows, not translation alone. Translation is
      // cached for ~13% of poems (#713); transliteration exists for all of them,
      // so translation-only would show this reader nothing on most of the feed.
      pick('english');
      expect(useUIStore.getState().showTranslation).toBe(true);
      expect(useUIStore.getState().showTransliteration).toBe(true);

      // A reader working through the Arabic gets the phonetic row, which is the
      // only bridge that works on every poem — translations are generated lazily
      // and most poems do not have one cached yet.
      pick('learning');
      expect(useUIStore.getState().showTransliteration).toBe(true);

      // Fluent: neither aid, just the poem.
      pick('arabic');
      expect(useUIStore.getState().showTranslation).toBe(false);
      expect(useUIStore.getState().showTransliteration).toBe(false);
    });

    it('clears when the chosen posture is tapped again', async () => {
      render(<OnboardingFlow />);
      await screen.findByTestId('onboarding-welcome-posture');
      const btn = screen
        .getAllByTestId('onboarding-welcome-posture-option')
        .find((b) => b.getAttribute('data-posture') === 'arabic');

      fireEvent.click(btn);
      expect(useUIStore.getState().readingPosture).toBe('arabic');
      fireEvent.click(btn);
      expect(useUIStore.getState().readingPosture).toBeNull();
    });

    it('survives leaving through the second door', async () => {
      // Applied on tap, not on completion, so a reader who answers the language
      // question and then chooses to just read still keeps it.
      const onComplete = vi.fn();
      render(<OnboardingFlow onComplete={onComplete} />);
      await screen.findByTestId('onboarding-welcome-posture');
      fireEvent.click(
        screen
          .getAllByTestId('onboarding-welcome-posture-option')
          .find((b) => b.getAttribute('data-posture') === 'english')
      );
      fireEvent.click(screen.getByTestId('onboarding-welcome-skip-all'));
      await waitFor(() => expect(onComplete).toHaveBeenCalled());
      expect(useUIStore.getState().readingPosture).toBe('english');
    });
  });

  it('gives every step its own component rather than one reskinned picker', async () => {
    fetchCategories.mockResolvedValue(FULL_TAXONOMY);
    await enterFlow();
    // Mood is a field of coloured embers; imagery is a grid of drawings. If both
    // ever render the same markup again, the redesign has been undone.
    expect(screen.getAllByTestId('onboarding-mood-option')[0].querySelector('svg')).toBeNull();
    fireEvent.click(screen.getByTestId('onboarding-mood-continue'));
    await screen.findByTestId('onboarding-motif');
    expect(screen.getAllByTestId('onboarding-motif-option')[0].querySelector('svg')).toBeTruthy();
  });
});

describe('sampled bands', () => {
  // When the server predates the `distributions` payload, bands are cut from a
  // client-side sample. Proportions survive sampling; absolute counts do not —
  // "37" out of a 300-poem sample would read as 37 poems out of the whole library.
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
