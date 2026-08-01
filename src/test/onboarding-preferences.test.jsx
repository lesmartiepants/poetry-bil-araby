import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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
import { fetchCategories } from '../services/database.js';

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

describe('OnboardingFlow', () => {
  it('renders the mood step from the fallback list pre-migration', async () => {
    render(<OnboardingFlow />);
    const items = await screen.findAllByTestId('mood-item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('renders taxonomy moods when the dimension is populated', async () => {
    fetchCategories.mockResolvedValue(TAXONOMY);
    render(<OnboardingFlow />);
    await waitFor(() => expect(screen.getAllByTestId('mood-item')).toHaveLength(2));
  });
});

describe('PreferencesDrawer', () => {
  it('renders a section per preference when open', async () => {
    render(<PreferencesDrawer isOpen onClose={() => {}} />);
    expect(await screen.findByTestId('preferences-drawer')).toBeTruthy();
    expect(screen.getByTestId('prefs-edit-mood')).toBeTruthy();
    expect(screen.getByTestId('prefs-edit-era')).toBeTruthy();
    expect(screen.getByTestId('prefs-edit-topic')).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(<PreferencesDrawer isOpen={false} onClose={() => {}} />);
    expect(screen.queryByTestId('preferences-drawer')).toBeNull();
  });
});
