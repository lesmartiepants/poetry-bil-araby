// Poetry pieces used by two or more features.
import { Link } from 'wouter';
import type { Collection, Line, PoemSummary, Poet } from '@core/types';
import { stripMarks, words } from '@core/logic/arabic';
import { Chevron, Mark, Play } from '@ds/icons';
import { isPatternName, Pattern, type PatternName, type Tone } from '@ds/Pattern';

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

// Panel art, as the canvas assigns it: each era has its pattern, a collection
// names its own (or gets one from its slug) and takes the tone of its colour.
const TONE: Record<string, Tone> = { '#4A1620': 'pom', '#22406E': 'cob', '#2F6B5A': 'ver', '#1E4A3E': 'ver', '#141A33': 'ind' };
const ERA_ART: Record<string, { name: PatternName; tone: Tone }> = {
  'pre-islamic': { name: 'sanaa', tone: 'pom' },
  umayyad: { name: 'ogee', tone: 'ver' },
  abbasid: { name: 'brickknot', tone: 'm' },
  andalusian: { name: 'laceria', tone: 'cob' },
  late: { name: 'sebka', tone: 'm' },
  modern: { name: 'seljuk', tone: 'ind' },
};
const CARD_PATTERNS: PatternName[] = ['laceria', 'seljuk', 'ogee', 'sebka', 'starcross', 'mamluk'];

export function eraArt(eraKey: string) {
  return ERA_ART[eraKey] ?? ERA_ART.abbasid;
}

// A poet's hero shows where they wrote (Arabia reuses Lacería), in the era's tone.
const REGION_PATTERN: Record<string, PatternName> = {
  Najd: 'laceria', Hijaz: 'laceria', Arabia: 'laceria', Iraq: 'brickknot', Levant: 'mamluk', Syria: 'mamluk',
  Andalusia: 'laceria', Maghreb: 'sebka', Egypt: 'starcross', Yemen: 'sanaa', Persia: 'haftrang', Anatolia: 'seljuk',
};
const ERA_TONE: Record<string, Tone> = { 'pre-islamic': 'pom', umayyad: 'ver', abbasid: 'cob', andalusian: 'ver', late: 'ind', modern: 'ind' };

export function poetArt(region: string | undefined, eraKey: string) {
  const name = region ? REGION_PATTERN[region] : undefined;
  return name ? { name, tone: ERA_TONE[eraKey] ?? 'pom' } : eraArt(eraKey);
}

export function collectionArt(c: Pick<Collection, 'slug' | 'colour' | 'pattern'>) {
  const hash = [...c.slug].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const name = isPatternName(c.pattern) ? c.pattern : CARD_PATTERNS[hash % CARD_PATTERNS.length];
  return { name, tone: TONE[c.colour] ?? 'ind' };
}

/** The wordmark: "poetry بالعربي" and the mark, centred in hub headers. */
export function BrandLogo() {
  return (
    <span className="brand" role="img" aria-label="poetry بالعربي">
      <span className="brand__en">poetry</span><span lang="ar" className="brand__ar">بالعربي</span>
      <span className="brand__mark"><Mark size={23} colour="var(--c-accent)" /></span>
    </span>
  );
}

/** A collection or journey as a pattern card; with `progress` it shows how far the reader is. */
export function CollectionCard({ c, href, progress }: { c: Collection; href?: string; progress?: number }) {
  const art = collectionArt(c);
  const of = c.poemIds.length;
  return (
    <Link href={href ?? `/collection/${c.slug}`} className={`coll-card panel${progress !== undefined ? ' coll-card--progress' : ''}`} style={{ background: c.colour }}>
      <Pattern {...art} scale={progress !== undefined ? 0.7 : 0.8} scrim="fade" />
      <div>
        <p lang="ar" className="coll-card__ar">{c.titleAr}</p>
        <p className="coll-card__en">{c.titleEn}</p>
        {progress === undefined ? <p className="coll-card__count">{of} POEMS</p> : (
          <p className="coll-card__progress">
            <span className="coll-card__bar"><span style={{ width: `${of ? Math.round((progress / of) * 100) : 0}%` }} /></span>
            <span className="coll-card__count">{progress} OF {of}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

/** A poem as a small card: its era's pattern over its titles (shelves, recent keeps). */
export function PoemTile({ poem, href, small }: { poem: PoemSummary; href?: string; small?: boolean }) {
  return (
    <Link href={href ?? `/p/${poem.slug}`} className={`poem-tile${small ? ' poem-tile--small' : ''}`}>
      <span className="poem-tile__art panel"><Pattern {...eraArt(poem.eraKey)} scale={0.55} /></span>
      <span className="poem-tile__text">
        <span lang="ar" dir="rtl" className="poem-tile__ar">{poem.titleAr}</span>
        <span className="poem-tile__en">{poem.titleEn}</span>
        <span className="poem-tile__poet">{poem.poetEn}</span>
      </span>
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

/** The dock over a journey or collection: how far along, and the next step. */
export function PathDock({ label, pos, of, title, next }: { label: string; pos: number; of: number; title: string; next?: { href: string; label: string } }) {
  return (
    <div className="path-dock">
      <div className="path-dock__progress">
        <div className="path-dock__label"><span>{label}</span><span>{pos} OF {of}</span></div>
        <div className="path-dock__bar" role="progressbar" aria-label={`${title} progress`} aria-valuemin={0} aria-valuemax={of} aria-valuenow={pos}>
          {Array.from({ length: of }, (_, i) => <span key={i} className={i < pos ? 'is-read' : i === pos ? 'is-next' : ''} />)}
        </div>
      </div>
      {next ? <Link href={next.href} className="path-dock__go"><Play size={14} /> {next.label}</Link> : <span className="path-dock__go path-dock__go--done">COMPLETE</span>}
    </div>
  );
}
