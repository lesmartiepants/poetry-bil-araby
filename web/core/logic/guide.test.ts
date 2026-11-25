import { describe, expect, it } from 'vitest';
import { chooseDoors, doorPools, sharedImage, wordDoors, type GuideRow } from './guide';

const source: GuideRow = {
  id: 1,
  poet_id: 1,
  poet_en: 'Al-Rundī',
  mood_primary: 'contemplation',
  motif_keys: ['moon-stars'],
  arabic: 'حَتَّى إِذَا انْطَبَعَتْ لَيْلًا بِهِ شُهْبُ',
};
const target: GuideRow = {
  id: 2,
  poet_id: 2,
  poet_en: 'Al-Mutanabbi',
  mood_primary: 'pride',
  motif_keys: ['moon-stars'],
  arabic: 'فَلَا تَقْنَعْ بِمَا دُونَ النُّجُومِ',
};

describe('image doors', () => {
  it('requires the same concrete image and different primary feelings', () => {
    expect(sharedImage(source, target)).toEqual({
      label: 'Stars',
      fromLine: source.arabic,
      toLine: target.arabic,
    });
    expect(sharedImage(source, { ...target, mood_primary: 'contemplation' })).toBeNull();
    expect(sharedImage(source, { ...target, mood_primary: null })).toBeNull();
    expect(sharedImage(source, { ...target, arabic: 'وَالقَمَرُ' })).toBeNull();
    expect(sharedImage(source, { ...target, motif_keys: [] })).toBeNull();
    expect(sharedImage(
      { ...source, motif_keys: ['desert-ruins'], arabic: 'أَمُرُّ عَلَى الدِّيَارِ' },
      { ...target, motif_keys: ['desert-ruins'], arabic: 'السَّيْرُ فَوْقَ بِحَارِ الرَّمْلِ مَهْلَكَةٌ' }
    )).toBeNull();
  });

  it('keeps the same-feeling door first and fills open spots with fresh picks', () => {
    const feeling = { ...target, id: 3, poet_id: 3, mood_primary: 'contemplation' };
    const fresh = { ...target, id: 4, poet_id: 4, era_key: 'modern' };
    const chosen = chooseDoors(source, doorPools(source, [feeling], [target, fresh], null, [target]));

    expect(chosen.map(({ kind, row }) => [kind, row.id])).toEqual([
      ['feeling', 3], ['image', 2], ['new', 4],
    ]);
    expect(wordDoors(chosen, source, 'contemplation').map(({ connection }) => connection)).toEqual([
      { kind: 'feeling', label: 'Contemplation, in another poet’s voice' },
      { kind: 'image', label: 'Stars, from contemplation to pride' },
      { kind: 'new', label: 'A new voice from the Modern era' },
    ]);
  });

  it('uses the selected rule and available catalog labels for factual connections', () => {
    const picks = wordDoors([
      { kind: 'full', row: source },
      { kind: 'poet', row: source },
      { kind: 'poet', row: { ...source, poet_en: '', poet_ar: 'أبو البقاء الرندي' } },
      { kind: 'image', row: { ...target, mood_primary: 'amorous', mood_label: 'amorous' } },
      { kind: 'new', row: { ...target, era_key: 'unspecified' } },
    ], source, 'contemplation');

    expect(picks.map(({ connection }) => connection.label)).toEqual([
      'The full poem behind this excerpt',
      'Another poem by Al-Rundī',
      'Another poem by أبو البقاء الرندي',
      'Stars, from contemplation to desire',
      'A different voice',
    ]);
  });
});
