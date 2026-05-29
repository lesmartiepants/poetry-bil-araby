import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Trash2, ExternalLink, Pin } from 'lucide-react';
import { formatRelative, groupByRecency, firstLine } from './utils.js';

/**
 * Library v2 · Option E — Waraqa (وَرَقَة)
 *
 * "Indie / Bear Notes / personal journal" direction.
 * The library floats as a narrow card beside the poem — no scrim,
 * no full-screen takeover. The main poem stays readable.
 *
 * • Narrow floating card positioned to the left of the sidebar area
 * • Drag handle at top (aesthetic — suggests resizability)
 * • Pinned poems in a horizontal scroll strip
 * • Time-grouped list with excerpt previews
 * • Hover-reveal Read / Remove actions per row
 */
const SavedPoemsView_E_Waraqa = ({
  isOpen,
  onClose,
  savedPoems = [],
  onSelectPoem,
  onUnsavePoem,
  theme,
  darkMode = true,
}) => {
  const [query, setQuery] = useState('');
  const [pinnedIds, setPinnedIds] = useState(() => new Set());
  const [hoverId, setHoverId] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const togglePin = (id) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = savedPoems.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.poet || '').toLowerCase().includes(q) ||
      (p.poem_text || '').toLowerCase().includes(q)
    );
  });

  const pinned = savedPoems.filter((p) => pinnedIds.has(p.id));
  const unpinned = filtered.filter((p) => !pinnedIds.has(p.id));
  const groups = groupByRecency(unpinned);

  const gold = '#C5A059';
  const border = darkMode ? 'rgba(197,160,89,0.14)' : 'rgba(197,160,89,0.22)';
  const txt = darkMode ? 'rgba(231,229,228,0.90)' : 'rgba(28,25,23,0.90)';
  const txtMute = darkMode ? 'rgba(231,229,228,0.40)' : 'rgba(28,25,23,0.40)';
  const glass = darkMode ? 'rgba(19,17,14,0.90)' : 'rgba(255,252,244,0.96)';
  const rowHover = darkMode ? 'rgba(197,160,89,0.06)' : 'rgba(197,160,89,0.07)';
  const pinBorder = darkMode ? 'rgba(197,160,89,0.18)' : 'rgba(197,160,89,0.22)';
  const sectionBorder = darkMode ? 'rgba(197,160,89,0.10)' : 'rgba(197,160,89,0.15)';

  const poets = Array.from(new Set(savedPoems.map((p) => p.poet).filter(Boolean)));

  return (
    <AnimatePresence>
      <motion.div
        key="waraqa-card"
        initial={{ opacity: 0, x: 24, scale: 0.97 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 24, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: 56,
          right: 'max(380px, 28vw)',
          bottom: 72,
          width: 'min(360px, calc(100vw - max(380px, 28vw) - 24px))',
          zIndex: 80,
          borderRadius: 18,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: glass,
          backdropFilter: 'blur(32px) saturate(130%)',
          border: `1px solid ${border}`,
          boxShadow: darkMode
            ? '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.65), 0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 4px 24px rgba(28,25,23,0.15), inset 0 1px 0 rgba(197,160,89,0.2)',
        }}
        role="dialog"
        aria-label="Saved poems — Waraqa"
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
          <div style={{ width: 32, height: 4, borderRadius: 2, background: 'rgba(197,160,89,0.25)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '8px 18px 14px', borderBottom: `1px solid ${sectionBorder}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{
                fontFamily: "'Reem Kufi', sans-serif", fontWeight: 700,
                fontSize: 20, color: gold, direction: 'rtl',
                textShadow: darkMode ? '0 0 24px rgba(197,160,89,0.15)' : 'none',
              }}>محفوظاتي</div>
              <div style={{
                fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic',
                fontSize: 11, color: txtMute, direction: 'rtl', marginTop: 2,
              }}>My saved verses</div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: 8,
                border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
                background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
              }}>
              <X size={13} color={txtMute} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: "'Tajawal', sans-serif", fontSize: 11, color: txtMute }}>
            <span><span style={{ color: gold, fontWeight: 600, fontSize: 12 }}>{savedPoems.length}</span> poems</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.35 }} />
            <span><span style={{ color: gold, fontWeight: 600, fontSize: 12 }}>{poets.length}</span> poets</span>
            {pinnedIds.size > 0 && (
              <>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', opacity: 0.35 }} />
                <span>{pinnedIds.size} pinned</span>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{
          padding: '10px 14px',
          borderBottom: `1px solid ${sectionBorder}`,
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <Search size={14} color={`rgba(197,160,89,0.50)`} style={{ flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث… search"
            dir="rtl"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: "'Tajawal', sans-serif", fontSize: 13, color: txt,
            }}
          />
        </div>

        {/* Pinned section */}
        {pinned.length > 0 && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 14px 5px',
              fontFamily: "'Forum', serif", fontSize: 10,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: txtMute, flexShrink: 0,
            }}>
              <Pin size={10} color="currentColor" />
              Pinned
            </div>
            <div style={{
              display: 'flex', gap: 8, padding: '6px 14px 10px',
              overflowX: 'auto', flexShrink: 0,
              borderBottom: `1px solid ${sectionBorder}`,
            }}>
              {pinned.map((p) => (
                <div
                  key={p.id}
                  onClick={() => { onSelectPoem(p); onClose(); }}
                  style={{
                    flexShrink: 0, width: 130, padding: '10px 12px',
                    borderRadius: 10,
                    background: darkMode ? 'rgba(197,160,89,0.07)' : 'rgba(197,160,89,0.08)',
                    border: `1px solid ${pinBorder}`,
                    cursor: 'pointer',
                  }}>
                  <Pin size={12} color={`rgba(197,160,89,0.5)`} style={{ marginBottom: 5 }} />
                  <div style={{
                    fontFamily: "'Reem Kufi', sans-serif", fontSize: 13, fontWeight: 600,
                    color: gold, direction: 'rtl',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: 3,
                  }}>{p.title}</div>
                  <div style={{
                    fontFamily: "'Fustat', sans-serif", fontSize: 10, color: txtMute,
                    direction: 'rtl', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{p.poet}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Main list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 8px' }}>
          {filtered.length === 0 && (
            <div style={{
              padding: '32px 20px', textAlign: 'center',
              fontFamily: "'Tajawal', sans-serif", fontSize: 13, color: txtMute,
            }}>لا نتائج · No results</div>
          )}
          {groups.map((group) => (
            <div key={group.id}>
              <div style={{
                padding: '8px 14px 3px',
                fontFamily: "'Tajawal', sans-serif", fontSize: 10,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: txtMute, opacity: 0.7,
              }}>{group.label}</div>
              {group.items.map((poem) => {
                const isHov = hoverId === poem.id;
                return (
                  <div
                    key={poem.id}
                    onMouseEnter={() => setHoverId(poem.id)}
                    onMouseLeave={() => setHoverId(null)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '9px 14px',
                      cursor: 'pointer',
                      borderRadius: 8, margin: '1px 6px',
                      background: isHov ? rowHover : 'transparent',
                      transition: 'background 120ms',
                      position: 'relative',
                    }}>
                    {/* Left dot */}
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                      border: '1.5px solid rgba(197,160,89,0.35)',
                      background: 'transparent',
                    }} />
                    {/* Body */}
                    <div style={{ flex: 1, minWidth: 0, direction: 'rtl' }}>
                      <div style={{
                        fontFamily: "'Reem Kufi', sans-serif", fontWeight: 600,
                        fontSize: 14, color: txt,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{poem.title}</div>
                      <div style={{
                        fontFamily: "'Amiri', serif", fontSize: 12,
                        color: txtMute, lineHeight: 1.7,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginTop: 2,
                      }}>{firstLine(poem.poem_text)}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontFamily: "'Fustat', sans-serif", fontSize: 10, color: 'rgba(197,160,89,0.5)' }}>{poem.poet}</span>
                        <span style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(197,160,89,0.3)' }} />
                        <span style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 10, color: txtMute }}>{formatRelative(poem.saved_at)}</span>
                      </div>
                    </div>
                    {/* Hover actions */}
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0, opacity: isHov ? 1 : 0, transition: 'opacity 120ms', paddingTop: 2 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectPoem(poem); onClose(); }}
                        title="Read"
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
                          background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>
                        <ExternalLink size={11} color={txtMute} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePin(poem.id); }}
                        title="Pin"
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
                          background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>
                        <Pin size={11} color={txtMute} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUnsavePoem(poem.id); }}
                        title="Remove"
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          border: darkMode ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.08)',
                          background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>
                        <Trash2 size={11} color={txtMute} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          borderTop: `1px solid ${sectionBorder}`,
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 11, color: txtMute }}>
            {savedPoems.length} saved poems
          </span>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 8,
            border: '1px solid rgba(197,160,89,0.20)',
            background: 'rgba(197,160,89,0.07)',
            fontFamily: "'Tajawal', sans-serif", fontSize: 12,
            color: 'rgba(197,160,89,0.80)', cursor: 'pointer',
          }}>
            <ExternalLink size={12} color="currentColor" />
            Export
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SavedPoemsView_E_Waraqa;
