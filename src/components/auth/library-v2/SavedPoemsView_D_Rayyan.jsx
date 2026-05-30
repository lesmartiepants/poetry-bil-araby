import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Trash2, ExternalLink, ChevronDown } from 'lucide-react';
import { formatRelative, ROMAN, groupByRecency, firstLine } from './utils.js';

/**
 * Library v2 · Option D — Rayyan (ريَّان)
 *
 * "Top product designer" direction — Linear / Vercel / Arc command-palette UX.
 * The library as a precision tool: ⌘K for your saved poems.
 *
 * Desktop: Centered overlay (not full-screen) — sits above the poem, never fully covers it.
 *   Split pane: indexed list on the left, live poem preview on the right.
 *   Keyboard shortcuts in the footer (↑ ↓ navigate · ↵ open · ⌫ remove).
 *
 * Mobile: Bottom sheet with single-column list (no split pane, no keyboard-on-open).
 */
const SavedPoemsView_D_Rayyan = ({
  isOpen,
  onClose,
  savedPoems = [],
  onSelectPoem,
  onUnsavePoem,
  theme,
  darkMode = true,
}) => {
  const [query, setQuery] = useState('');
  const [activePoet, setActivePoet] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  useEffect(() => {
    if (!isOpen) return undefined;
    // Only autofocus on desktop — on mobile the keyboard would push the sheet off-screen
    if (!isMobile) {
      inputRef.current?.focus();
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[activeIndex]) { onSelectPoem(filtered[activeIndex]); onClose(); }
      if (e.key === 'Backspace' && e.metaKey && filtered[activeIndex]) { onUnsavePoem(filtered[activeIndex]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const poets = Array.from(new Set(savedPoems.map((p) => p.poet).filter(Boolean)));

  const filtered = savedPoems.filter((p) => {
    if (activePoet !== 'all' && p.poet !== activePoet) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.poet || '').toLowerCase().includes(q) ||
      (p.poem_text || '').toLowerCase().includes(q)
    );
  });

  const groups = groupByRecency(filtered);
  const activePoem = filtered[activeIndex] || null;

  // Flat ordered list for row numbering
  const flat = groups.flatMap((g) => g.items);

  const dim = darkMode ? 'rgba(12,12,14,0.55)' : 'rgba(200,195,185,0.55)';
  const glass = darkMode
    ? 'rgba(16,15,20,0.92)'
    : 'rgba(252,250,245,0.96)';
  const border = darkMode ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)';
  const txt = darkMode ? 'rgba(231,229,228,0.90)' : 'rgba(28,25,23,0.90)';
  const txtMute = darkMode ? 'rgba(231,229,228,0.40)' : 'rgba(28,25,23,0.40)';
  const gold = '#C5A059';
  const rowBorder = darkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)';

  // Mobile bottom sheet layout
  if (isMobile) {
    return (
      <AnimatePresence>
        {/* Scrim */}
        <motion.div
          key="rayyan-scrim-mobile"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 80,
            background: darkMode ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.30)',
          }}
        />
        <motion.div
          key="rayyan-sheet-mobile"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            height: '82vh',
            zIndex: 81,
            borderRadius: '24px 24px 0 0',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: glass,
            border: `1px solid ${border}`,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.45)',
          }}
          role="dialog"
          aria-label="Saved poems"
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(197,160,89,0.30)', border: 'none', cursor: 'pointer' }}
              aria-label="Close"
            />
          </div>

          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 20px 12px',
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}>
            <div style={{
              fontFamily: "'Reem Kufi', sans-serif", fontWeight: 700,
              fontSize: 20, color: gold, direction: 'rtl',
            }}>محفوظاتي</div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: `1px solid ${border}`,
                background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
              <X size={14} color={txtMute} />
            </button>
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px',
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}>
            <Search size={15} color={gold} style={{ opacity: 0.65, flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              placeholder="ابحث في محفوظاتك…"
              dir="rtl"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: "'Tajawal', sans-serif", fontSize: 15,
                color: txt,
              }}
            />
          </div>

          {/* Poet chips */}
          {poets.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              borderBottom: `1px solid ${border}`,
              flexShrink: 0, overflowX: 'auto',
            }}>
              {['all', ...poets].map((p) => (
                <button key={p} onClick={() => { setActivePoet(p); setActiveIndex(0); }} style={{
                  padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                  fontFamily: "'Tajawal', sans-serif", fontSize: 12, whiteSpace: 'nowrap',
                  background: activePoet === p
                    ? darkMode ? 'rgba(197,160,89,0.18)' : 'rgba(197,160,89,0.15)'
                    : 'transparent',
                  color: activePoet === p ? gold : txtMute,
                  outline: activePoet === p ? `1px solid rgba(197,160,89,0.35)` : 'none',
                }}>
                  {p === 'all' ? 'الكل · All' : p}
                </button>
              ))}
            </div>
          )}

          {/* List (full width on mobile, no preview pane) */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
            {filtered.length === 0 && (
              <div style={{
                padding: '32px 20px', textAlign: 'center',
                fontFamily: "'Tajawal', sans-serif", fontSize: 13, color: txtMute,
              }}>لا نتائج · No results</div>
            )}
            {groups.map((group) => (
              <div key={group.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px 5px',
                  fontFamily: "'Forum', serif", fontSize: 10,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: txtMute, position: 'sticky', top: 0, zIndex: 2,
                  background: darkMode ? 'rgba(16,15,20,0.95)' : 'rgba(252,250,245,0.97)',
                }}>
                  <ChevronDown size={11} color="currentColor" />
                  {group.label}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 18, height: 18, borderRadius: 4,
                    background: 'rgba(197,160,89,0.10)',
                    fontSize: 10, color: 'rgba(197,160,89,0.70)',
                    fontFamily: "'Tajawal', sans-serif",
                  }}>{group.items.length}</span>
                </div>
                {group.items.map((poem) => {
                  const flatIdx = flat.indexOf(poem);
                  const isActive = flatIdx === activeIndex;
                  return (
                    <div
                      key={poem.id}
                      onClick={() => { setActiveIndex(flatIdx); onSelectPoem(poem); onClose(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '13px 16px', cursor: 'pointer',
                        borderBottom: `1px solid ${rowBorder}`,
                        background: isActive
                          ? darkMode ? 'rgba(197,160,89,0.08)' : 'rgba(197,160,89,0.08)'
                          : 'transparent',
                        position: 'relative',
                      }}
                    >
                      {isActive && (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: 2, background: gold, borderRadius: '0 2px 2px 0',
                        }} />
                      )}
                      <span style={{
                        fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic',
                        fontSize: 11, color: 'rgba(197,160,89,0.45)',
                        width: 18, flexShrink: 0, textAlign: 'right',
                      }}>
                        {ROMAN[flatIdx] || (flatIdx + 1)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0, direction: 'rtl' }}>
                        <div style={{
                          fontFamily: "'Reem Kufi', sans-serif", fontWeight: 600,
                          fontSize: 15, color: isActive ? gold : txt,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{poem.title || '—'}</div>
                        <div style={{
                          fontFamily: "'Fustat', sans-serif", fontSize: 12,
                          color: txtMute, marginTop: 1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{poem.poet || ''}</div>
                        {poem.poem_text && (
                          <div style={{
                            fontFamily: "'Amiri', serif", fontSize: 12,
                            color: txtMute, marginTop: 2, direction: 'rtl',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            opacity: 0.7,
                          }}>{firstLine(poem.poem_text)}</div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUnsavePoem(poem); }}
                        title="Remove"
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: `1px solid ${border}`,
                          background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0,
                        }}>
                        <Trash2 size={14} color={txtMute} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Footer count */}
          <div style={{
            padding: '10px 16px',
            borderTop: `1px solid ${border}`,
            flexShrink: 0,
            fontFamily: "'Tajawal', sans-serif", fontSize: 11, color: txtMute,
            textAlign: 'center',
          }}>
            {filtered.length} saved poems
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop: command-palette layout
  return (
    <AnimatePresence>
      <motion.div
        key="rayyan-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          background: darkMode ? 'rgba(0,0,0,0.40)' : 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <motion.div
        key="rayyan-palette"
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '10vh',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(720px, calc(100vw - 2rem))',
          maxHeight: '78vh',
          zIndex: 81,
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: glass,
          border: `1px solid ${border}`,
          boxShadow: darkMode
            ? '0 0 0 1px rgba(255,255,255,0.09), 0 8px 32px rgba(0,0,0,0.72), 0 32px 80px rgba(0,0,0,0.55)'
            : '0 4px 32px rgba(28,25,23,0.18), 0 1px 0 rgba(0,0,0,0.06)',
        }}
        role="dialog"
        aria-label="Saved poems — command palette"
      >
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '16px 20px',
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}>
          <Search size={16} color={gold} style={{ opacity: 0.75, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="ابحث في محفوظاتك… search saved poems"
            dir="rtl"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: "'Tajawal', sans-serif", fontSize: 16,
              color: txt, letterSpacing: '0.01em',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <kbd style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '2px 7px', borderRadius: 5, fontFamily: "'Tajawal', sans-serif",
              fontSize: 11, border: `1px solid ${border}`,
              background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: txtMute, minWidth: 22, height: 20,
            }}>esc</kbd>
          </div>
        </div>

        {/* Poet filter chips */}
        {poets.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 20px 8px',
            borderBottom: `1px solid ${border}`,
            flexShrink: 0, overflowX: 'auto',
          }}>
            <span style={{
              fontFamily: "'Forum', serif", fontSize: 10,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: txtMute, marginLeft: 4, whiteSpace: 'nowrap',
            }}>Poet</span>
            {['all', ...poets].map((p) => (
              <button key={p} onClick={() => { setActivePoet(p); setActiveIndex(0); }} style={{
                padding: '4px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontFamily: "'Tajawal', sans-serif", fontSize: 12, whiteSpace: 'nowrap',
                background: activePoet === p
                  ? darkMode ? 'rgba(197,160,89,0.18)' : 'rgba(197,160,89,0.15)'
                  : 'transparent',
                color: activePoet === p ? gold : txtMute,
                outline: activePoet === p ? `1px solid rgba(197,160,89,0.35)` : 'none',
                transition: 'all 120ms ease',
              }}>
                {p === 'all' ? 'الكل · All' : p}
              </button>
            ))}
          </div>
        )}

        {/* Body: list + preview */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* Left: poem list */}
          <div style={{
            width: '56%', flexShrink: 0,
            borderRight: `1px solid ${border}`,
            overflowY: 'auto', overflowX: 'hidden',
          }}>
            {filtered.length === 0 && (
              <div style={{
                padding: '32px 20px', textAlign: 'center',
                fontFamily: "'Tajawal', sans-serif", fontSize: 13, color: txtMute,
              }}>لا نتائج · No results</div>
            )}
            {groups.map((group) => (
              <div key={group.id}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px 5px',
                  fontFamily: "'Forum', serif", fontSize: 10,
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  color: txtMute, position: 'sticky', top: 0, zIndex: 2,
                  background: darkMode ? 'rgba(16,15,20,0.92)' : 'rgba(252,250,245,0.96)',
                  backdropFilter: 'blur(8px)',
                }}>
                  <ChevronDown size={11} color="currentColor" />
                  {group.label}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 18, height: 18, borderRadius: 4,
                    background: 'rgba(197,160,89,0.10)',
                    fontSize: 10, color: 'rgba(197,160,89,0.70)',
                    fontFamily: "'Tajawal', sans-serif",
                  }}>{group.items.length}</span>
                </div>
                {group.items.map((poem) => {
                  const flatIdx = flat.indexOf(poem);
                  const isActive = flatIdx === activeIndex;
                  return (
                    <div
                      key={poem.id}
                      onClick={() => setActiveIndex(flatIdx)}
                      onDoubleClick={() => { onSelectPoem(poem); onClose(); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 16px', cursor: 'pointer',
                        borderBottom: `1px solid ${rowBorder}`,
                        background: isActive
                          ? darkMode ? 'rgba(197,160,89,0.08)' : 'rgba(197,160,89,0.08)'
                          : 'transparent',
                        position: 'relative', transition: 'background 120ms ease',
                      }}
                    >
                      {isActive && (
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: 2, background: gold, borderRadius: '0 2px 2px 0',
                        }} />
                      )}
                      <span style={{
                        fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic',
                        fontSize: 11, color: 'rgba(197,160,89,0.45)',
                        width: 18, flexShrink: 0, textAlign: 'right',
                      }}>
                        {ROMAN[flatIdx] || (flatIdx + 1)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0, direction: 'rtl' }}>
                        <div style={{
                          fontFamily: "'Reem Kufi', sans-serif", fontWeight: 600,
                          fontSize: 14, color: isActive ? gold : txt,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{poem.title || '—'}</div>
                        <div style={{
                          fontFamily: "'Fustat', sans-serif", fontSize: 11,
                          color: txtMute, marginTop: 1,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{poem.poet || ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: isActive ? 1 : 0, transition: 'opacity 100ms' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelectPoem(poem); onClose(); }}
                          title="Read poem"
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            border: `1px solid ${border}`,
                            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                          }}>
                          <ExternalLink size={12} color={txtMute} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onUnsavePoem(poem); }}
                          title="Remove"
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            border: `1px solid ${border}`,
                            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                          }}>
                          <Trash2 size={12} color={txtMute} />
                        </button>
                      </div>
                      <span style={{
                        fontFamily: "'Tajawal', sans-serif", fontSize: 10,
                        color: txtMute, whiteSpace: 'nowrap', flexShrink: 0,
                      }}>{formatRelative(poem.saved_at)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Right: poem preview */}
          <div style={{
            flex: 1, minWidth: 0, padding: '24px 22px',
            display: 'flex', flexDirection: 'column',
            overflowY: 'auto',
          }}>
            {activePoem ? (
              <>
                <div style={{
                  fontFamily: "'Forum', serif", fontSize: 10,
                  letterSpacing: '0.30em', textTransform: 'uppercase',
                  color: 'rgba(197,160,89,0.6)', marginBottom: 12,
                }}>قصيدة مختارة · Selected Poem</div>
                <div style={{
                  fontFamily: "'Reem Kufi', sans-serif", fontWeight: 700,
                  fontSize: 22, color: gold, direction: 'rtl',
                  lineHeight: 1.2, marginBottom: 4,
                }}>{activePoem.title}</div>
                <div style={{
                  fontFamily: "'Fustat', sans-serif", fontSize: 12,
                  color: txtMute, direction: 'rtl', letterSpacing: '0.06em',
                }}>{activePoem.poet}</div>
                <div style={{
                  height: 1, margin: '14px 0',
                  background: `linear-gradient(90deg, rgba(197,160,89,0.4) 0%, transparent 100%)`,
                }} />
                <div style={{
                  fontFamily: "'Amiri', serif", fontSize: 15, lineHeight: 2.3,
                  color: darkMode ? 'rgba(231,229,228,0.78)' : 'rgba(28,25,23,0.75)',
                  direction: 'rtl', flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 7,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {(activePoem.poem_text || '').split('\n').map((line, i) => (
                    <span key={i}>{line}<br /></span>
                  ))}
                </div>
                <div style={{
                  marginTop: 14, fontFamily: "'Tajawal', sans-serif",
                  fontSize: 11, color: txtMute,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  Saved {formatRelative(activePoem.saved_at)}
                </div>
                <div style={{
                  marginTop: 20, paddingTop: 16,
                  borderTop: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexShrink: 0,
                }}>
                  <button
                    onClick={() => { onSelectPoem(activePoem); onClose(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 16px', borderRadius: 8,
                      background: 'rgba(197,160,89,0.12)',
                      border: '1px solid rgba(197,160,89,0.30)',
                      fontFamily: "'Tajawal', sans-serif", fontSize: 13,
                      color: gold, cursor: 'pointer', transition: 'all 140ms ease',
                    }}>
                    <ExternalLink size={14} />
                    اقرأ · Read poem
                  </button>
                  <button
                    onClick={() => onUnsavePoem(activePoem)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 12px', borderRadius: 8,
                      border: `1px solid ${border}`,
                      background: 'transparent',
                      fontFamily: "'Tajawal', sans-serif", fontSize: 12,
                      color: txtMute, cursor: 'pointer',
                    }}>
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Tajawal', sans-serif", fontSize: 13, color: txtMute,
                direction: 'rtl',
              }}>اختر قصيدة · Select a poem</div>
            )}
          </div>
        </div>

        {/* Footer hint bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px',
          borderTop: `1px solid ${border}`,
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            fontFamily: "'Tajawal', sans-serif", fontSize: 11, color: txtMute,
          }}>
            {[['↑ ↓', 'Navigate'], ['↵', 'Open'], ['⌘⌫', 'Remove']].map(([key, label]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1px 5px', borderRadius: 4,
                  fontFamily: "'Tajawal', sans-serif", fontSize: 10,
                  border: `1px solid ${border}`,
                  background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  color: txtMute,
                }}>{key}</kbd>
                {label}
              </span>
            ))}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: "'Tajawal', sans-serif", fontSize: 11, color: txtMute, direction: 'rtl',
          }}>
            <span style={{
              padding: '2px 8px', borderRadius: 4,
              background: 'rgba(197,160,89,0.10)',
              color: 'rgba(197,160,89,0.80)', fontSize: 11,
              fontFamily: "'Tajawal', sans-serif",
            }}>{filtered.length} saved</span>
            <span>محفوظاتي</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SavedPoemsView_D_Rayyan;
