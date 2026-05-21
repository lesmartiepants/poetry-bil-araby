import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, Loader2, Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';
import { THEME } from '../../constants/index.js';
import TagBadge from './TagBadge.jsx';
import { fetchTags, fetchPoemTags, addPoemTag, removePoemTag } from '../../services/tags.js';

/**
 * Modal to manually add/remove tags from a poem.
 *
 * Props:
 *   poem    — { id, title, poet, titleArabic, poetArabic }
 *   onClose — () => void
 */
export default function PoemTagEditor({ poem, onClose }) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;

  const [allTags, setAllTags] = useState([]);
  const [poemTagIds, setPoemTagIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // tagId being saved

  const panelBg = darkMode ? '#111113' : '#FDFCF8';
  const borderColor = darkMode ? 'rgba(197,160,89,0.14)' : 'rgba(107,87,68,0.14)';
  const textPrimary = darkMode ? '#E8E0D0' : '#2C1810';
  const textMuted = darkMode ? 'rgba(212,200,180,0.5)' : 'rgba(60,40,20,0.5)';
  const inputBg = darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!poem?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [tagsData, poemTags] = await Promise.all([fetchTags(), fetchPoemTags(poem.id)]);
        setAllTags(tagsData.tags || tagsData);
        setPoemTagIds(new Set((poemTags || []).map((t) => t.id)));
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [poem?.id]);

  const filteredTags = useMemo(() => {
    if (!debouncedSearch) return allTags;
    return allTags.filter(
      (t) =>
        (t.name_ar || '').toLowerCase().includes(debouncedSearch) ||
        (t.name_en || '').toLowerCase().includes(debouncedSearch)
    );
  }, [allTags, debouncedSearch]);

  const handleToggle = useCallback(
    async (tag) => {
      if (saving) return;
      setSaving(tag.id);
      const isAdded = poemTagIds.has(tag.id);
      try {
        if (isAdded) {
          await removePoemTag(poem.id, tag.id);
          setPoemTagIds((prev) => {
            const next = new Set(prev);
            next.delete(tag.id);
            return next;
          });
        } else {
          await addPoemTag(poem.id, tag.id);
          setPoemTagIds((prev) => new Set([...prev, tag.id]));
        }
      } catch {
        /* silently fail */
      } finally {
        setSaving(null);
      }
    },
    [poem?.id, poemTagIds, saving]
  );

  // Currently applied tags (shown at top)
  const appliedTags = useMemo(
    () => allTags.filter((t) => poemTagIds.has(t.id)),
    [allTags, poemTagIds]
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: darkMode ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{
          width: '100%',
          maxWidth: '520px',
          background: panelBg,
          borderRadius: '1.25rem',
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '80vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '0.875rem 1.125rem 0.75rem',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: '1rem',
                color: 'var(--gold)',
                direction: 'rtl',
                marginBottom: '0.1rem',
              }}
            >
              تعديل الوسوم
            </div>
            <div
              style={{
                fontFamily: "'Forum', serif",
                fontSize: '0.68rem',
                color: textMuted,
                letterSpacing: '0.05em',
              }}
            >
              {poem?.poet || poem?.poetArabic} — {poem?.title || poem?.titleArabic}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tag editor"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: textMuted,
              display: 'flex',
              padding: '0.25rem',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Applied tags */}
        {appliedTags.length > 0 && (
          <div
            style={{
              padding: '0.625rem 1.125rem',
              borderBottom: `1px solid ${borderColor}`,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.35rem',
            }}
          >
            {appliedTags.map((tag) => (
              <TagBadge
                key={tag.id}
                tag={tag}
                active
                onClick={saving === tag.id ? undefined : () => handleToggle(tag)}
                size="sm"
              />
            ))}
          </div>
        )}

        {/* Search */}
        <div
          style={{
            padding: '0.625rem 1.125rem',
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: inputBg,
          }}
        >
          <Search size={13} style={{ color: 'var(--gold)', opacity: 0.6, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        </div>

        {/* Tag list */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '2.5rem',
              }}
            >
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--gold)' }} />
            </div>
          ) : (
            filteredTags.map((tag) => {
              const isApplied = poemTagIds.has(tag.id);
              const isSaving = saving === tag.id;
              return (
                <button
                  key={tag.id}
                  onClick={() => handleToggle(tag)}
                  disabled={!!saving}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 1.125rem',
                    background: isApplied ? 'rgba(197,160,89,0.07)' : 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${borderColor}`,
                    cursor: saving ? 'wait' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.05rem',
                      textAlign: 'right',
                    }}
                  >
                    <span
                      dir="rtl"
                      style={{
                        fontFamily: "'Amiri', serif",
                        fontSize: '0.88rem',
                        color: isApplied ? 'var(--gold)' : textPrimary,
                      }}
                    >
                      {tag.name_ar}
                    </span>
                    {tag.name_en && (
                      <span
                        style={{
                          fontFamily: "'Forum', serif",
                          fontSize: '0.65rem',
                          color: textMuted,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {tag.name_en}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isApplied ? '2px solid var(--gold)' : `2px solid ${borderColor}`,
                      background: isApplied ? 'rgba(197,160,89,0.2)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSaving ? (
                      <Loader2
                        size={11}
                        className="animate-spin"
                        style={{ color: 'var(--gold)' }}
                      />
                    ) : isApplied ? (
                      <Check size={11} style={{ color: 'var(--gold)' }} />
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
