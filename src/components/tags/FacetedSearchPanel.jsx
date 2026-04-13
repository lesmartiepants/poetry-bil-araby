import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search,
  X,
  SlidersHorizontal,
  Shuffle,
  Tag,
  ChevronDown,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';
import { usePoemStore } from '../../stores/poemStore';
import { THEME, GOLD } from '../../constants/index.js';
import TagBadge from './TagBadge.jsx';
import { searchPoems, fetchPoemByTags } from '../../services/database.js';

const SORT_OPTIONS = [
  { value: 'relevance', labelEn: 'Relevance', labelAr: 'الصلة' },
  { value: 'random', labelEn: 'Random', labelAr: 'عشوائي' },
  { value: 'tag_count', labelEn: 'Most tagged', labelAr: 'الأكثر وسوماً' },
];

/**
 * FacetedSearchPanel — unified faceted search combining:
 *   - Text search (Arabic/English)
 *   - Tag filters (AND/OR) with active chip display
 *   - Poet filter
 *   - Sort options
 *   - Filtered results count
 *   - "Explore similar" (navigate to poem with overlapping tags)
 *
 * Props:
 *   allTags        — Array of tag objects { id, name_ar, name_en }
 *   categories     — Array of { slug, name_ar, name_en }
 *   dynamicPoets   — Array of { name, name_en, poem_count }
 *   selectedTagIds — Set<number>
 *   tagOperator    — 'AND' | 'OR'
 *   onToggleTag    — (tagId) => void
 *   onSetOperator  — ('AND'|'OR') => void
 *   onClearTags    — () => void
 *   onSelectPoem   — (poem) => void  — navigate to a poem from results
 *   onClose        — () => void
 */
export default function FacetedSearchPanel({
  allTags = [],
  categories = [],
  dynamicPoets = [],
  selectedTagIds = new Set(),
  tagOperator = 'OR',
  onToggleTag,
  onSetOperator,
  onClearTags,
  onSelectPoem,
  onClose,
}) {
  const darkMode = useUIStore((s) => s.darkMode);
  const selectedCategory = usePoemStore((s) => s.selectedCategory);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [debouncedTagSearch, setDebouncedTagSearch] = useState('');

  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchRef = useRef(null);
  const abortRef = useRef(null);

  // Palette
  const panelBg = darkMode ? 'rgba(10,10,12,0.98)' : 'rgba(253,252,248,0.98)';
  const borderColor = darkMode ? 'rgba(197,160,89,0.13)' : 'rgba(107,87,68,0.13)';
  const textPrimary = darkMode ? '#E8E0D0' : '#2C1810';
  const textMuted = darkMode ? 'rgba(212,200,180,0.5)' : 'rgba(60,40,20,0.5)';
  const inputBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
  const resultHover = darkMode ? 'rgba(197,160,89,0.06)' : 'rgba(197,160,89,0.04)';
  const cardBorder = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  // Debounce query input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  // Debounce tag search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedTagSearch(tagSearch.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [tagSearch]);

  // Run search whenever debounced query, tags, or sort changes
  useEffect(() => {
    const hasQuery = !!debouncedQuery;
    const hasTags = selectedTagIds.size > 0;

    if (!hasQuery && !hasTags) {
      setResults([]);
      setTotal(null);
      setError(null);
      return;
    }

    // Abort previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const doSearch = async () => {
      setLoading(true);
      setError(null);
      try {
        let poems;
        if (hasQuery) {
          poems = await searchPoems({
            q: debouncedQuery,
            tagIds: Array.from(selectedTagIds),
            operator: tagOperator,
            poet: selectedCategory !== 'All' ? selectedCategory : undefined,
            sort,
            limit: 20,
          });
        } else {
          // Tag-only browse: fetch a batch by repeatedly calling fetchPoemByTags
          // (the backend returns one poem per call; we do up to 8 in parallel)
          const seenIds = new Set();
          const batch = await Promise.allSettled(
            Array.from({ length: 8 }, () =>
              fetchPoemByTags({
                tagIds: Array.from(selectedTagIds),
                operator: tagOperator,
                poet: selectedCategory !== 'All' ? selectedCategory : undefined,
                excludeIds: [],
              })
            )
          );
          poems = [];
          for (const result of batch) {
            if (
              result.status === 'fulfilled' &&
              result.value?.id &&
              !seenIds.has(result.value.id)
            ) {
              seenIds.add(result.value.id);
              poems.push(result.value);
            }
          }
        }

        if (!controller.signal.aborted) {
          setResults(poems);
          setTotal(poems.length);
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    doSearch();
    return () => controller.abort();
  }, [debouncedQuery, selectedTagIds, tagOperator, selectedCategory, sort]);

  // Focus search on mount
  useEffect(() => {
    const t = setTimeout(() => searchRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Filtered tag list for tag picker
  const filteredTags = useMemo(() => {
    if (!debouncedTagSearch) return allTags;
    return allTags.filter(
      (t) =>
        (t.name_ar || '').toLowerCase().includes(debouncedTagSearch) ||
        (t.name_en || '').toLowerCase().includes(debouncedTagSearch)
    );
  }, [allTags, debouncedTagSearch]);

  const activeTags = useMemo(
    () => allTags.filter((t) => selectedTagIds.has(t.id)),
    [allTags, selectedTagIds]
  );

  const hasActiveFilters = selectedTagIds.size > 0 || !!debouncedQuery;
  const currentSortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.labelEn || 'Sort';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 250,
        background: darkMode ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '4rem 1rem 2rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 24, opacity: 0 }}
        style={{
          width: '100%',
          maxWidth: '600px',
          background: panelBg,
          borderRadius: '1.25rem',
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.875rem 1rem',
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <Search size={16} style={{ color: 'var(--gold)', opacity: 0.7, flexShrink: 0 }} />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search poems, poets, themes… / ابحث في الأشعار"
            dir="auto"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: textPrimary,
              fontSize: '0.875rem',
              fontFamily: "'Tajawal', sans-serif",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}
              aria-label="Clear query"
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: textMuted,
              marginLeft: '0.25rem',
            }}
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter controls row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderBottom: `1px solid ${borderColor}`,
            flexWrap: 'wrap',
          }}
        >
          {/* Tag filter toggle */}
          <button
            onClick={() => setShowTagPicker((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '999px',
              border: `1px solid ${showTagPicker || selectedTagIds.size > 0 ? 'rgba(197,160,89,0.5)' : borderColor}`,
              background: selectedTagIds.size > 0 ? 'rgba(197,160,89,0.1)' : 'transparent',
              cursor: 'pointer',
              color: selectedTagIds.size > 0 ? 'var(--gold)' : textMuted,
              fontSize: '0.7rem',
              fontFamily: "'Forum', serif",
              letterSpacing: '0.04em',
              transition: 'all 0.2s',
            }}
          >
            <Tag size={11} />
            Tags {selectedTagIds.size > 0 && `(${selectedTagIds.size})`}
          </button>

          {/* AND/OR toggle — only when tags selected */}
          {selectedTagIds.size > 1 && (
            <div
              style={{
                display: 'flex',
                borderRadius: '999px',
                border: `1px solid rgba(197,160,89,0.3)`,
                overflow: 'hidden',
              }}
            >
              {['AND', 'OR'].map((op) => (
                <button
                  key={op}
                  onClick={() => onSetOperator?.(op)}
                  style={{
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.6rem',
                    fontFamily: "'Forum', serif",
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: tagOperator === op ? 'rgba(197,160,89,0.2)' : 'transparent',
                    color: tagOperator === op ? 'var(--gold)' : textMuted,
                  }}
                >
                  {op}
                </button>
              ))}
            </div>
          )}

          {/* Sort menu */}
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <button
              onClick={() => setShowSortMenu((p) => !p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                border: `1px solid ${borderColor}`,
                background: 'transparent',
                cursor: 'pointer',
                color: textMuted,
                fontSize: '0.7rem',
                fontFamily: "'Forum', serif",
                letterSpacing: '0.04em',
              }}
            >
              <SlidersHorizontal size={11} />
              {currentSortLabel}
              <ChevronDown size={10} />
            </button>
            {showSortMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  zIndex: 10,
                  background: darkMode ? '#141416' : '#FDFCF8',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '0.75rem',
                  overflow: 'hidden',
                  minWidth: '130px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setSort(opt.value);
                      setShowSortMenu(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      background: sort === opt.value ? 'rgba(197,160,89,0.1)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: sort === opt.value ? 'var(--gold)' : textPrimary,
                      fontSize: '0.75rem',
                      fontFamily: "'Forum', serif',",
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.05rem',
                    }}
                  >
                    <span>{opt.labelEn}</span>
                    <span
                      dir="rtl"
                      style={{ fontFamily: "'Amiri', serif", fontSize: '0.7rem', opacity: 0.6 }}
                    >
                      {opt.labelAr}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tag picker — collapsible */}
        <AnimatePresence>
          {showTagPicker && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div
                style={{
                  borderBottom: `1px solid ${borderColor}`,
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {/* Tag search */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: inputBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '0.5rem',
                    padding: '0.3rem 0.6rem',
                  }}
                >
                  <Search size={12} style={{ color: textMuted, flexShrink: 0 }} />
                  <input
                    type="text"
                    value={tagSearch}
                    onChange={(e) => setTagSearch(e.target.value)}
                    placeholder="Filter tags..."
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: textPrimary,
                      fontSize: '0.72rem',
                      fontFamily: "'Tajawal', sans-serif",
                    }}
                  />
                </div>

                {/* Tag chips */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.35rem',
                    maxHeight: '120px',
                    overflowY: 'auto',
                  }}
                >
                  {filteredTags.slice(0, 80).map((tag) => (
                    <TagBadge
                      key={tag.id}
                      tag={tag}
                      active={selectedTagIds.has(tag.id)}
                      onClick={() => onToggleTag?.(tag.id)}
                      size="sm"
                    />
                  ))}
                  {filteredTags.length === 0 && (
                    <span
                      style={{
                        fontSize: '0.72rem',
                        color: textMuted,
                        fontFamily: "'Tajawal', sans-serif",
                        padding: '0.25rem 0',
                      }}
                    >
                      No tags match
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active tag chips row */}
        {activeTags.length > 0 && !showTagPicker && (
          <div
            style={{
              padding: '0.4rem 1rem',
              borderBottom: `1px solid ${borderColor}`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.3rem',
              alignItems: 'center',
            }}
          >
            {activeTags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                active
                onClick={() => onToggleTag?.(tag.id)}
                size="sm"
              />
            ))}
            <button
              onClick={onClearTags}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: textMuted,
                fontSize: '0.65rem',
                fontFamily: "'Tajawal', sans-serif",
                padding: '0.1rem 0.2rem',
              }}
            >
              Clear
            </button>
          </div>
        )}

        {/* Results area */}
        <div style={{ overflowY: 'auto', maxHeight: '420px' }}>
          {/* Status bar */}
          {(loading || total !== null || error) && (
            <div
              style={{
                padding: '0.45rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderBottom: `1px solid ${borderColor}`,
                fontSize: '0.68rem',
                fontFamily: "'Forum', serif",
                color: textMuted,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={12} className="animate-spin" style={{ color: 'var(--gold)' }} />
                  Searching…
                </>
              ) : error ? (
                <span style={{ color: '#f87171' }}>{error}</span>
              ) : total !== null ? (
                <>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{total}</span>
                  {total === 1 ? ' poem found' : ' poems found'}
                  {selectedTagIds.size > 0 && (
                    <span style={{ opacity: 0.6 }}>
                      {' '}
                      · {selectedTagIds.size} tag{selectedTagIds.size > 1 ? 's' : ''} ({tagOperator}
                      )
                    </span>
                  )}
                  {sort !== 'relevance' && (
                    <span style={{ opacity: 0.6 }}>
                      {' '}
                      · sorted by {currentSortLabel.toLowerCase()}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Empty state — no query, no tags */}
          {!hasActiveFilters && !loading && (
            <div
              style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                color: textMuted,
                fontSize: '0.78rem',
                fontFamily: "'Tajawal', sans-serif",
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <Search size={24} style={{ opacity: 0.3, color: 'var(--gold)' }} />
              <div>Type to search, or select tags to browse</div>
              <div
                dir="rtl"
                style={{ fontFamily: "'Amiri', serif", opacity: 0.5, fontSize: '0.85rem' }}
              >
                ابحث أو اختر وسوماً للاستكشاف
              </div>
            </div>
          )}

          {/* Result list */}
          {results.map((poem) => (
            <button
              key={poem.id || poem.arabic?.slice(0, 20)}
              onClick={() => {
                onSelectPoem?.(poem);
                onClose?.();
              }}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.2rem',
                padding: '0.75rem 1rem',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${cardBorder}`,
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = resultHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <div dir="rtl" style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: '0.92rem',
                      color: textPrimary,
                      fontWeight: 500,
                    }}
                  >
                    {poem.titleArabic || poem.title || 'قصيدة'}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: '0.75rem',
                      color: 'var(--gold)',
                      opacity: 0.8,
                      marginTop: '0.1rem',
                    }}
                  >
                    {poem.poetArabic || poem.poet}
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  style={{ color: textMuted, opacity: 0.5, flexShrink: 0, marginTop: '0.2rem' }}
                />
              </div>
              {/* First line preview */}
              {poem.arabic && (
                <div
                  dir="rtl"
                  style={{
                    fontFamily: "'Amiri', serif",
                    fontSize: '0.8rem',
                    color: textMuted,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: 'vertical',
                    marginTop: '0.15rem',
                  }}
                >
                  {poem.arabic.split('\n')[0]}
                </div>
              )}
              {/* Tag badges on result */}
              {Array.isArray(poem.tags) && poem.tags.length > 0 && (
                <div
                  style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginTop: '0.25rem' }}
                >
                  {poem.tags.slice(0, 4).map((tag) => {
                    const tagObj =
                      typeof tag === 'object' ? tag : { id: tag, name_ar: tag, name_en: tag };
                    return (
                      <TagBadge
                        key={tagObj.id || tag}
                        tag={tagObj}
                        active={selectedTagIds.has(tagObj.id)}
                        size="sm"
                      />
                    );
                  })}
                  {poem.tags.length > 4 && (
                    <span style={{ fontSize: '0.6rem', color: textMuted, alignSelf: 'center' }}>
                      +{poem.tags.length - 4}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}

          {/* No results */}
          {hasActiveFilters && !loading && results.length === 0 && !error && (
            <div
              style={{
                padding: '2rem',
                textAlign: 'center',
                color: textMuted,
                fontSize: '0.78rem',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              No poems found
              {selectedTagIds.size > 0 && tagOperator === 'AND' && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.68rem' }}>
                  Try switching to OR to broaden the search
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
