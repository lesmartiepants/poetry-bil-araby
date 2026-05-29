import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Trash2, ExternalLink, Share2, LayoutGrid, List } from 'lucide-react';
import { formatRelative, firstLine } from './utils.js';

/**
 * Library v2 · Option F — Loh (لَوح)
 *
 * "Editorial / art director / creative director" direction.
 * Each poem is a collector's print — your library is a gallery.
 * Visual-first, scroll-through, museum-quality.
 *
 * • Full-screen gallery takeover
 * • Featured tile (first poem) spans 2×2 columns
 * • Each poet gets a unique gradient color story
 * • Hover reveals Read + Share + Remove overlay actions
 * • Grid ↔ list toggle · search pill · poet filter chips
 */

const POET_GRAD = {
  'المتنبي': 'linear-gradient(160deg, rgba(197,160,89,0.12) 0%, rgba(130,100,55,0.45) 55%, rgba(60,45,20,0.80) 100%), linear-gradient(0deg, #1a1408 0%, #2a2010 60%, #14110a 100%)',
  'محمود درويش': 'linear-gradient(150deg, rgba(74,124,201,0.16) 0%, rgba(50,80,150,0.50) 55%, rgba(20,35,80,0.85) 100%), linear-gradient(0deg, #080d18 0%, #10183a 60%, #080d18 100%)',
  'نزار قباني': 'linear-gradient(145deg, rgba(160,89,120,0.16) 0%, rgba(120,55,90,0.48) 55%, rgba(55,20,45,0.82) 100%), linear-gradient(0deg, #130a10 0%, #281525 60%, #130a10 100%)',
  'جبران خليل جبران': 'linear-gradient(155deg, rgba(89,160,140,0.16) 0%, rgba(55,130,110,0.48) 55%, rgba(20,60,50,0.82) 100%), linear-gradient(0deg, #090f0d 0%, #122420 60%, #090f0d 100%)',
  'أحمد شوقي': 'linear-gradient(148deg, rgba(197,160,89,0.10) 0%, rgba(160,120,55,0.40) 55%, rgba(80,55,20,0.78) 100%), linear-gradient(0deg, #141008 0%, #281f0d 60%, #141008 100%)',
  'ابن الرومي': 'linear-gradient(152deg, rgba(180,89,89,0.14) 0%, rgba(140,60,60,0.44) 55%, rgba(65,20,20,0.80) 100%), linear-gradient(0deg, #120808 0%, #231515 60%, #120808 100%)',
  'أبو العلاء المعري': 'linear-gradient(158deg, rgba(120,89,180,0.14) 0%, rgba(90,55,150,0.44) 55%, rgba(35,18,75,0.80) 100%), linear-gradient(0deg, #0c0812 0%, #1a1028 60%, #0c0812 100%)',
};
const GRAD_DEFAULT = 'linear-gradient(155deg, rgba(197,160,89,0.08) 0%, rgba(100,85,55,0.35) 55%, rgba(40,30,15,0.72) 100%), linear-gradient(0deg, #111008 0%, #1e1a0c 60%, #111008 100%)';

const getGrad = (poet) => POET_GRAD[poet] || GRAD_DEFAULT;

const SavedPoemsView_F_Loh = ({
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
  const [viewMode, setViewMode] = useState('grid');
  const [hoverId, setHoverId] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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

  const gold = '#C5A059';
  const border = 'rgba(255,255,255,0.06)';
  const txt = 'rgba(231,229,228,0.92)';
  const txtMute = 'rgba(231,229,228,0.42)';
  const chipBorder = 'rgba(255,255,255,0.08)';

  return (
    <AnimatePresence>
      <motion.div
        key="loh-gallery"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 80,
          display: 'flex', flexDirection: 'column',
          background: '#0c0c0e',
        }}
        role="dialog"
        aria-label="Saved poems gallery — Loh"
      >
        {/* Gallery header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 36px 16px',
          borderBottom: `1px solid ${border}`,
          flexShrink: 0, position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
            <div style={{
              fontFamily: "'Reem Kufi', sans-serif", fontWeight: 700,
              fontSize: 26, color: gold, direction: 'rtl',
              textShadow: '0 0 30px rgba(197,160,89,0.15)',
            }}>لَوحَة القصائد</div>
            <div style={{
              fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic',
              fontSize: 14, color: txtMute, letterSpacing: '0.03em',
            }}>Poetry collection</div>
          </div>

          {/* View toggle — centered */}
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 8,
          }}>
            {[
              { mode: 'grid', Icon: LayoutGrid },
              { mode: 'list', Icon: List },
            ].map(({ mode, Icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: viewMode === mode ? '1px solid rgba(197,160,89,0.28)' : `1px solid ${border}`,
                  background: viewMode === mode ? 'rgba(197,160,89,0.12)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}>
                <Icon size={15} color={viewMode === mode ? gold : txtMute} />
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Search pill */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 999,
              border: `1px solid ${border}`,
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(8px)',
              width: 200,
            }}>
              <Search size={14} color={txtMute} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث في مجموعتك…"
                dir="rtl"
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontFamily: "'Tajawal', sans-serif", fontSize: 13, color: txt,
                }}
              />
            </div>
            {/* Count badge */}
            <span style={{
              padding: '4px 10px', borderRadius: 6,
              background: 'rgba(197,160,89,0.10)',
              fontFamily: "'Tajawal', sans-serif", fontSize: 12,
              color: 'rgba(197,160,89,0.80)',
            }}>{filtered.length} poems</span>
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                width: 36, height: 36, borderRadius: 10,
                border: `1px solid ${border}`,
                background: 'rgba(255,255,255,0.03)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}>
              <X size={16} color={txtMute} />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 36px',
          borderBottom: `1px solid rgba(255,255,255,0.04)`,
          flexShrink: 0, overflowX: 'auto',
        }}>
          {['all', ...poets].map((p) => (
            <button key={p} onClick={() => setActivePoet(p)} style={{
              padding: '5px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontFamily: "'Tajawal', sans-serif", fontSize: 12, whiteSpace: 'nowrap',
              background: activePoet === p ? 'rgba(197,160,89,0.15)' : 'rgba(255,255,255,0.04)',
              color: activePoet === p ? gold : txtMute,
              outline: activePoet === p ? '1px solid rgba(197,160,89,0.35)' : 'none',
              transition: 'all 120ms ease',
            }}>
              {p === 'all' ? 'الكل · All' : p}
            </button>
          ))}
        </div>

        {/* Gallery grid */}
        {viewMode === 'grid' ? (
          <div style={{
            flex: 1, overflowY: 'auto', padding: '28px 36px 40px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 18,
            alignContent: 'start',
          }}>
            {filtered.length === 0 && (
              <div style={{
                gridColumn: '1/-1', padding: '48px 0', textAlign: 'center',
                fontFamily: "'Tajawal', sans-serif", fontSize: 16, color: txtMute,
              }}>لا قصائد محفوظة · No poems saved</div>
            )}
            {filtered.map((poem, idx) => {
              const isFeatured = idx === 0 && filtered.length > 1;
              const isHov = hoverId === poem.id;
              return (
                <motion.div
                  key={poem.id}
                  onHoverStart={() => setHoverId(poem.id)}
                  onHoverEnd={() => setHoverId(null)}
                  style={{
                    gridColumn: isFeatured ? 'span 2' : 'span 1',
                    gridRow: isFeatured ? 'span 2' : 'span 1',
                    borderRadius: 16, overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative',
                    border: `1px solid ${border}`,
                  }}
                  whileHover={{ y: -3, boxShadow: '0 14px 40px rgba(0,0,0,0.5)' }}
                  transition={{ duration: 0.16 }}
                >
                  {/* Cover */}
                  <div style={{
                    position: 'relative', width: '100%',
                    aspectRatio: isFeatured ? '3/2' : '3/2',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'flex-end', padding: 20,
                    background: getGrad(poem.poet),
                  }}>
                    {/* Watermark */}
                    <div style={{
                      position: 'absolute', top: 14, right: 14,
                      fontFamily: "'Reem Kufi', sans-serif",
                      fontSize: isFeatured ? 48 : 28, fontWeight: 700,
                      opacity: 0.08, color: '#fff', lineHeight: 1,
                      direction: 'rtl', userSelect: 'none',
                    }}>
                      {(poem.title || '').slice(0, 2)}
                    </div>
                    {/* Card content */}
                    <div style={{ position: 'relative', zIndex: 2, direction: 'rtl' }}>
                      <div style={{
                        fontFamily: "'Forum', serif",
                        fontSize: isFeatured ? 11 : 9,
                        letterSpacing: '0.28em', textTransform: 'uppercase',
                        color: 'rgba(197,160,89,0.70)', marginBottom: 6,
                      }}>
                        {isFeatured ? 'قصيدة مميزة · Featured' : 'قصيدة · Poem'}
                      </div>
                      <div style={{
                        fontFamily: "'Reem Kufi', sans-serif", fontWeight: 700,
                        fontSize: isFeatured ? 30 : 18, lineHeight: 1.15,
                        color: 'rgba(231,229,228,0.92)',
                        textShadow: '0 1px 8px rgba(0,0,0,0.5)',
                      }}>{poem.title}</div>
                      <div style={{
                        fontFamily: "'Amiri', serif",
                        fontSize: isFeatured ? 14 : 12, lineHeight: 1.9,
                        color: isFeatured ? 'rgba(231,229,228,0.65)' : 'rgba(231,229,228,0.55)',
                        marginTop: 6,
                        display: '-webkit-box',
                        WebkitLineClamp: isFeatured ? 3 : 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>{firstLine(poem.poem_text)}</div>
                    </div>
                    {/* Hover overlay */}
                    <div style={{
                      position: 'absolute', inset: 0, zIndex: 5,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      background: 'rgba(0,0,0,0.55)',
                      opacity: isHov ? 1 : 0,
                      transition: 'opacity 160ms ease',
                      borderRadius: '16px 16px 0 0',
                    }}>
                      <button
                        onClick={() => { onSelectPoem(poem); onClose(); }}
                        style={{
                          padding: '8px 16px', borderRadius: 8,
                          border: '1px solid rgba(197,160,89,0.45)',
                          background: 'rgba(197,160,89,0.18)',
                          backdropFilter: 'blur(12px)',
                          fontFamily: "'Tajawal', sans-serif", fontSize: 12,
                          color: gold, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        <ExternalLink size={13} />
                        اقرأ · Read
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onUnsavePoem(poem.id); }}
                        style={{
                          padding: '8px 16px', borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.20)',
                          background: 'rgba(255,255,255,0.10)',
                          backdropFilter: 'blur(12px)',
                          fontFamily: "'Tajawal', sans-serif", fontSize: 12,
                          color: 'rgba(231,229,228,0.90)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                        <Trash2 size={13} />
                        Remove
                      </button>
                    </div>
                  </div>
                  {/* Poet bar */}
                  <div style={{
                    padding: '10px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    background: 'rgba(12,12,14,0.70)',
                  }}>
                    <span style={{
                      fontFamily: "'Fustat', sans-serif",
                      fontSize: isFeatured ? 14 : 12,
                      color: 'rgba(197,160,89,0.70)', direction: 'rtl',
                    }}>{poem.poet}</span>
                    <span style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 10, color: txtMute }}>
                      {formatRelative(poem.saved_at)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* List view */
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 36px' }}>
            {filtered.map((poem, idx) => (
              <div
                key={poem.id}
                onMouseEnter={() => setHoverId(poem.id)}
                onMouseLeave={() => setHoverId(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '16px 0',
                  borderBottom: `1px solid ${border}`,
                  cursor: 'pointer',
                }}>
                {/* Gradient swatch */}
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: getGrad(poem.poet),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1px solid ${border}`,
                }}>
                  <span style={{
                    fontFamily: "'Reem Kufi', sans-serif", fontSize: 16, fontWeight: 700,
                    color: 'rgba(255,255,255,0.6)', direction: 'rtl',
                  }}>{(poem.title || '').slice(0, 1)}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, direction: 'rtl' }}>
                  <div style={{
                    fontFamily: "'Reem Kufi', sans-serif", fontWeight: 600, fontSize: 16, color: txt,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{poem.title}</div>
                  <div style={{ fontFamily: "'Fustat', sans-serif", fontSize: 12, color: 'rgba(197,160,89,0.60)', marginTop: 2 }}>
                    {poem.poet} · {formatRelative(poem.saved_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, opacity: hoverId === poem.id ? 1 : 0, transition: 'opacity 120ms' }}>
                  <button onClick={() => { onSelectPoem(poem); onClose(); }} style={{
                    padding: '6px 14px', borderRadius: 8,
                    border: '1px solid rgba(197,160,89,0.30)', background: 'rgba(197,160,89,0.12)',
                    fontFamily: "'Tajawal', sans-serif", fontSize: 12, color: gold, cursor: 'pointer',
                  }}>Read</button>
                  <button onClick={() => onUnsavePoem(poem.id)} style={{
                    padding: '6px 12px', borderRadius: 8,
                    border: `1px solid ${border}`, background: 'transparent',
                    fontFamily: "'Tajawal', sans-serif", fontSize: 12, color: txtMute, cursor: 'pointer',
                  }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default SavedPoemsView_F_Loh;
