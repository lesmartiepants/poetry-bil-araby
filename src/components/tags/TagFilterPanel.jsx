import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { THEME, GOLD } from '../../constants/index.js';
import TagBadge from './TagBadge.jsx';

/**
 * Collapsible tag filter panel with hierarchical tag tree, search,
 * multi-select checkboxes, AND/OR toggle, and active filter chips.
 *
 * Props:
 *   tags           — flat array of tag objects { id, name_ar, name_en, category_slug, poem_count }
 *   categories     — array of { slug, name_ar, name_en }
 *   selectedTagIds — Set<id> of currently selected tag IDs
 *   operator       — 'AND' | 'OR'
 *   onToggleTag    — (tagId) => void
 *   onSetOperator  — ('AND'|'OR') => void
 *   onClearAll     — () => void
 */
export default function TagFilterPanel({
  tags = [],
  categories = [],
  selectedTagIds = new Set(),
  operator = 'OR',
  onToggleTag,
  onSetOperator,
  onClearAll,
}) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;

  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const searchRef = useRef(null);

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Group tags by category
  const tagsByCategory = useMemo(() => {
    const map = new Map();
    for (const cat of categories) {
      map.set(cat.slug, { ...cat, tags: [] });
    }
    // Uncategorized bucket
    map.set('__other__', { slug: '__other__', name_ar: 'أخرى', name_en: 'Other', tags: [] });

    for (const tag of tags) {
      const slug = tag.category_slug || '__other__';
      if (!map.has(slug)) {
        map.set(slug, { slug, name_ar: slug, name_en: slug, tags: [] });
      }
      map.get(slug).tags.push(tag);
    }
    // Remove empty buckets
    for (const [k, v] of map) {
      if (v.tags.length === 0) map.delete(k);
    }
    return map;
  }, [tags, categories]);

  // Filter tags by search
  const filteredTagsByCategory = useMemo(() => {
    if (!debouncedSearch) return tagsByCategory;
    const result = new Map();
    for (const [slug, cat] of tagsByCategory) {
      const filtered = cat.tags.filter(
        (t) =>
          (t.name_ar || '').toLowerCase().includes(debouncedSearch) ||
          (t.name_en || '').toLowerCase().includes(debouncedSearch)
      );
      if (filtered.length > 0) {
        result.set(slug, { ...cat, tags: filtered });
      }
    }
    return result;
  }, [tagsByCategory, debouncedSearch]);

  const toggleCategory = useCallback((slug) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  // Active (selected) tags for chip display
  const activeTags = useMemo(
    () => tags.filter((t) => selectedTagIds.has(t.id)),
    [tags, selectedTagIds]
  );

  const hasFilters = selectedTagIds.size > 0;

  const panelBg = darkMode ? 'rgba(12,12,14,0.97)' : 'rgba(253,252,248,0.97)';
  const borderColor = darkMode ? 'rgba(197,160,89,0.12)' : 'rgba(107,87,68,0.12)';
  const inputBg = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const inputBorder = darkMode ? 'rgba(197,160,89,0.15)' : 'rgba(107,87,68,0.15)';
  const textPrimary = darkMode ? '#E8E0D0' : '#2C1810';
  const textMuted = darkMode ? 'rgba(212,200,180,0.5)' : 'rgba(60,40,20,0.5)';

  return (
    <div
      style={{
        background: panelBg,
        border: `1px solid ${borderColor}`,
        borderRadius: '1rem',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Search input */}
      <div
        style={{
          padding: '0.75rem 0.875rem 0.5rem',
          borderBottom: `1px solid ${borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Search size={14} style={{ color: 'var(--gold)', opacity: 0.6, flexShrink: 0 }} />
        <input
          ref={searchRef}
          type="text"
          placeholder="Search tags... / ابحث عن وسم"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          dir="auto"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: textPrimary,
            fontSize: '0.75rem',
            fontFamily: "'Tajawal', sans-serif",
          }}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="Clear search"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: textMuted,
              padding: 0,
              display: 'flex',
            }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Active filter chips + AND/OR toggle */}
      {hasFilters && (
        <div
          style={{
            padding: '0.5rem 0.875rem',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          {/* AND/OR toggle */}
          <div
            style={{
              display: 'flex',
              borderRadius: '999px',
              border: `1px solid rgba(197,160,89,0.3)`,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {['AND', 'OR'].map((op) => (
              <button
                key={op}
                onClick={() => onSetOperator?.(op)}
                style={{
                  padding: '0.15rem 0.5rem',
                  fontSize: '0.6rem',
                  fontFamily: "'Forum', serif",
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: operator === op ? 'rgba(197,160,89,0.2)' : 'transparent',
                  color: operator === op ? 'var(--gold)' : textMuted,
                }}
              >
                {op}
              </button>
            ))}
          </div>

          {/* Active chips */}
          {activeTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              active
              onClick={() => onToggleTag?.(tag.id)}
              size="sm"
            />
          ))}

          {/* Clear all */}
          <button
            onClick={onClearAll}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: textMuted,
              fontSize: '0.65rem',
              fontFamily: "'Tajawal', sans-serif",
              padding: '0.1rem 0.25rem',
              transition: 'color 0.2s',
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Tag tree */}
      <div
        style={{
          overflowY: 'auto',
          maxHeight: '360px',
          padding: '0.25rem 0',
        }}
      >
        {filteredTagsByCategory.size === 0 ? (
          <div
            style={{
              padding: '1.5rem',
              textAlign: 'center',
              color: textMuted,
              fontSize: '0.75rem',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            No tags found
          </div>
        ) : (
          Array.from(filteredTagsByCategory.values()).map((cat) => {
            const isExpanded = expandedCategories.has(cat.slug) || !!debouncedSearch;
            const catSelectedCount = cat.tags.filter((t) => selectedTagIds.has(t.id)).length;

            return (
              <div key={cat.slug}>
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat.slug)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.45rem 0.875rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: textPrimary,
                    fontSize: '0.72rem',
                    fontFamily: "'Tajawal', sans-serif",
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {isExpanded ? (
                      <ChevronDown size={12} style={{ color: 'var(--gold)', opacity: 0.7 }} />
                    ) : (
                      <ChevronRight size={12} style={{ color: textMuted }} />
                    )}
                    <span dir="rtl" style={{ fontFamily: "'Amiri', serif", fontSize: '0.82rem' }}>
                      {cat.name_ar}
                    </span>
                    <span
                      dir="ltr"
                      style={{
                        opacity: 0.55,
                        fontSize: '0.68rem',
                        fontFamily: "'Forum', serif",
                      }}
                    >
                      {cat.name_en}
                    </span>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: textMuted,
                      fontSize: '0.65rem',
                    }}
                  >
                    {catSelectedCount > 0 && (
                      <span
                        style={{
                          background: 'rgba(197,160,89,0.2)',
                          color: 'var(--gold)',
                          borderRadius: '999px',
                          padding: '0 0.35rem',
                        }}
                      >
                        {catSelectedCount}
                      </span>
                    )}
                    <span style={{ opacity: 0.4 }}>{cat.tags.length}</span>
                  </span>
                </button>

                {/* Tags list */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '0.25rem 0.875rem 0.5rem 1.5rem',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.35rem',
                    }}
                  >
                    {cat.tags.map((tag) => (
                      <TagBadge
                        key={tag.id}
                        tag={tag}
                        count={tag.poem_count}
                        active={selectedTagIds.has(tag.id)}
                        onClick={() => onToggleTag?.(tag.id)}
                        size="sm"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
