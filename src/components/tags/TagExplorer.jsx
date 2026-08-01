import { useState, useEffect, useCallback } from 'react';
import { X, Loader2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';
import { THEME } from '../../constants/index.js';
import TagBadge from './TagBadge.jsx';
import { fetchTags, fetchTagCategories, fetchPoemTags } from '../../services/tags.js';

/**
 * TagExplorer — browse tags by category, preview poems per tag.
 *
 * Props:
 *   onClose       — () => void
 *   onSelectTag   — (tagId) => void — apply tag as filter and close
 */
export default function TagExplorer({ onClose, onSelectTag }) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const bgOverlay = darkMode ? 'rgba(12,12,14,0.92)' : 'rgba(253,252,248,0.92)';
  const panelBg = darkMode ? '#0c0c0e' : '#FDFCF8';
  const borderColor = darkMode ? 'rgba(197,160,89,0.12)' : 'rgba(107,87,68,0.12)';
  const textPrimary = darkMode ? '#E8E0D0' : '#2C1810';
  const textMuted = darkMode ? 'rgba(212,200,180,0.5)' : 'rgba(60,40,20,0.5)';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catData, tagData] = await Promise.all([fetchTagCategories(), fetchTags()]);
        setCategories(catData);
        setTags(tagData.tags || tagData);
        if (catData.length > 0) setSelectedCategory(catData[0].slug);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const tagsInCategory = selectedCategory
    ? tags.filter((t) => t.category_slug === selectedCategory)
    : tags;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: bgOverlay,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '4rem 1rem 2rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 32, opacity: 0 }}
        style={{
          width: '100%',
          maxWidth: '680px',
          background: panelBg,
          borderRadius: '1.25rem',
          border: `1px solid ${borderColor}`,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem 0.75rem',
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: '1.15rem',
                color: 'var(--gold)',
                direction: 'rtl',
              }}
            >
              استكشاف الوسوم
            </div>
            <div
              style={{
                fontFamily: "'Forum', serif",
                fontSize: '0.75rem',
                color: textMuted,
                letterSpacing: '0.06em',
              }}
            >
              Explore Tags
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close tag explorer"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: textMuted,
              display: 'flex',
              padding: '0.25rem',
              borderRadius: '0.5rem',
              transition: 'color 0.2s',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '3rem',
              color: textMuted,
            }}
          >
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--gold)' }} />
          </div>
        ) : error ? (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              color: darkMode ? '#f87171' : '#dc2626',
              fontSize: '0.8rem',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            {error}
          </div>
        ) : (
          <div style={{ display: 'flex', minHeight: '320px' }}>
            {/* Category sidebar */}
            <nav
              style={{
                width: '140px',
                flexShrink: 0,
                borderRight: `1px solid ${borderColor}`,
                overflowY: 'auto',
                padding: '0.5rem 0',
              }}
            >
              {categories.map((cat) => {
                const catTags = tags.filter((t) => t.category_slug === cat.slug);
                const isActive = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      setSelectedCategory(cat.slug);
                      setSelectedTag(null);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '0.5rem 0.75rem',
                      background: isActive ? 'rgba(197,160,89,0.1)' : 'transparent',
                      border: 'none',
                      borderRight: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.1rem',
                    }}
                  >
                    <span
                      dir="rtl"
                      style={{
                        fontFamily: "'Amiri', serif",
                        fontSize: '0.8rem',
                        color: isActive ? 'var(--gold)' : textPrimary,
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {cat.name_ar}
                    </span>
                    <span
                      style={{
                        fontFamily: "'Forum', serif",
                        fontSize: '0.62rem',
                        color: textMuted,
                        letterSpacing: '0.03em',
                      }}
                    >
                      {catTags.length} tags
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Tag grid */}
            <div
              style={{
                flex: 1,
                padding: '0.75rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {tagsInCategory.length === 0 ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    color: textMuted,
                    fontSize: '0.75rem',
                    fontFamily: "'Tajawal', sans-serif",
                  }}
                >
                  No tags in this category
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.45rem',
                    alignContent: 'flex-start',
                  }}
                >
                  {tagsInCategory.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      tag={tag}
                      count={tag.poem_count}
                      active={selectedTag?.id === tag.id}
                      onClick={(t) => setSelectedTag(selectedTag?.id === t.id ? null : t)}
                      size="md"
                    />
                  ))}
                </div>
              )}

              {/* Selected tag preview */}
              <AnimatePresence>
                {selectedTag && (
                  <motion.div
                    key={selectedTag.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    style={{
                      background: darkMode ? 'rgba(197,160,89,0.06)' : 'rgba(197,160,89,0.04)',
                      border: `1px solid rgba(197,160,89,0.2)`,
                      borderRadius: '0.75rem',
                      padding: '0.875rem',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: '0.5rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span
                          dir="rtl"
                          style={{
                            fontFamily: "'Amiri', serif",
                            fontSize: '0.95rem',
                            color: 'var(--gold)',
                          }}
                        >
                          {selectedTag.name_ar}
                        </span>
                        {selectedTag.name_en && (
                          <span
                            style={{
                              fontFamily: "'Forum', serif",
                              fontSize: '0.72rem',
                              color: textMuted,
                              marginLeft: '0.4rem',
                            }}
                          >
                            / {selectedTag.name_en}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => onSelectTag?.(selectedTag.id)}
                        style={{
                          background: 'rgba(197,160,89,0.15)',
                          border: '1px solid rgba(197,160,89,0.35)',
                          borderRadius: '0.5rem',
                          padding: '0.3rem 0.65rem',
                          cursor: 'pointer',
                          color: 'var(--gold)',
                          fontSize: '0.68rem',
                          fontFamily: "'Forum', serif",
                          letterSpacing: '0.06em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          transition: 'all 0.2s',
                        }}
                      >
                        Filter by this tag <ChevronRight size={11} />
                      </button>
                    </div>
                    {selectedTag.poem_count != null && (
                      <div
                        style={{
                          fontSize: '0.7rem',
                          color: textMuted,
                          fontFamily: "'Tajawal', sans-serif",
                        }}
                      >
                        {selectedTag.poem_count} poem{selectedTag.poem_count !== 1 ? 's' : ''}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
