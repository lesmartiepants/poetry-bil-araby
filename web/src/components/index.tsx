// Poetry pieces used by two or more features.
import { Link } from 'wouter';
import type { Collection, Line, PoemSummary, Poet } from '@core/types';
import { stripMarks, words } from '@core/logic/arabic';
import { Chevron } from '@ds/icons';

const ERA_INK: Record<string, string> = {
  'pre-islamic': '#4A1620', umayyad: '#2F6B5A', abbasid: '#22406E', andalusian: '#1E4A3E', modern: '#22406E', late: '#5C4C2A',
};

/** Ruq'ah initial on a parchment disc, rim and letter in the era colour. */
export function PoetAvatar({ initial, eraKey, size = 36 }: { initial: string; eraKey: string; size?: number }) {
  const ink = ERA_INK[eraKey] ?? '#4A1620';
  return (
    <span aria-hidden style={{
      flex: 'none', width: size, height: size, borderRadius: size / 2, background: '#EFE6D2', border: `${Math.max(2, size * 0.08)}px solid ${ink}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-ruqaa)', fontWeight: 700, fontSize: size * 0.56, color: ink, lineHeight: 1,
    }}>{initial}</span>
  );
}

export function PoemRow({ poem, initial, href, badge }: { poem: PoemSummary; initial?: string; href?: string; badge?: string }) {
  return (
    <Link href={href ?? `/p/${poem.slug}`} className="list-row">
      <PoetAvatar initial={initial ?? stripMarks(poem.poetAr)[0] ?? 'ش'} eraKey={poem.eraKey} />
      <div className="list-row__main">
        <p className="list-row__title">{poem.titleEn}</p>
        <p className="list-row__sub">{poem.poetEn}{badge && <span style={{ marginLeft: 8, color: 'var(--c-accent)', fontSize: 10, letterSpacing: '0.14em' }}>{badge}</span>}</p>
      </div>
      <span lang="ar" className="list-row__ar">{poem.titleAr}</span>
    </Link>
  );
}

export function PoetRow({ poet, sub, href }: { poet: Poet; sub?: string; href?: string }) {
  return (
    <Link href={href ?? `/poet/${poet.slug}`} className="list-row" style={{ padding: '10px 0' }}>
      <PoetAvatar initial={poet.initial} eraKey={poet.eraKey} size={40} />
      <div className="list-row__main">
        <p className="list-row__title">{poet.nameEn}</p>
        <p className="list-row__sub">{sub ?? `${poet.years} · ${poet.poemCount} poems`}</p>
      </div>
      <span lang="ar" className="list-row__ar" style={{ fontFamily: 'var(--font-amiri)' }}>{poet.nameAr}</span>
    </Link>
  );
}

export type WordState = 'past' | 'now' | 'future' | 'plain';

/** One verse line: Arabic words as tappable spans, the English line beneath. */
export function Verse({
  line, index, showMarks, under, translit, active, wordAt, onWord, onLine, dimmed, selectedWord,
}: {
  line: Line; index: number; showMarks: boolean; under: 'english' | 'sounds' | 'nothing'; translit?: string;
  active?: boolean; wordAt?: number; onWord?: (word: number) => void; onLine?: () => void; dimmed?: boolean; selectedWord?: number;
}) {
  const text = showMarks ? line.ar : line.plain ?? stripMarks(line.ar);
  const ws = words(text);
  const stateOf = (w: number): WordState => {
    if (!active || wordAt === undefined) return 'plain';
    if (wordAt < 0) return 'plain';
    return w < wordAt ? 'past' : w === wordAt ? 'now' : 'future';
  };
  return (
    <div className={`verse${active ? ' verse--active' : ''}${dimmed ? ' verse--dim' : ''}`} aria-current={active ? 'true' : undefined} data-line={index} onClick={onLine}>
      <p lang="ar" dir="rtl" className="verse__ar">
        {ws.map((w, i) => (
          <span key={i}>
            <span className={`word word--${stateOf(i)}${selectedWord === i ? ' word--selected' : ''}`} data-word={i} role={onWord ? 'button' : undefined} tabIndex={onWord ? 0 : undefined}
              onClick={onWord ? (e) => { e.stopPropagation(); onWord(i); } : undefined}>{w}</span>{i < ws.length - 1 ? ' ' : ''}
          </span>
        ))}
      </p>
      {under === 'english' && <p className="verse__en">{line.en}</p>}
      {under === 'sounds' && <p className="verse__en verse__en--sounds">{translit}</p>}
    </div>
  );
}

export function ProgressBar({ done, of, label }: { done: number; of: number; label?: string }) {
  return (
    <div className="stack gap-8">
      <div className="row gap-4" role="progressbar" aria-valuemin={0} aria-valuemax={of} aria-valuenow={done} aria-label={label ?? 'Progress'}>
        {Array.from({ length: of }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < done ? 'var(--c-accent)' : 'var(--c-border-2)' }} />
        ))}
      </div>
      <span className="t-count">{done} of {of}</span>
    </div>
  );
}

export function CollectionCard({ c, href }: { c: Collection; href?: string }) {
  return (
    <Link href={href ?? `/collection/${c.slug}`} className="coll-card" style={{ background: c.colour }}>
      <span lang="ar" className="coll-card__ar">{c.titleAr}</span>
      <span className="coll-card__en">{c.titleEn}</span>
      <span className="coll-card__count">{c.poemIds.length} POEMS</span>
    </Link>
  );
}

export function RowLink({ href, title, sub }: { href: string; title: string; sub?: string }) {
  return (
    <Link href={href} className="group-row">
      <div className="group-row__main"><p className="group-row__title">{title}</p>{sub && <p className="group-row__sub">{sub}</p>}</div>
      <Chevron />
    </Link>
  );
}
