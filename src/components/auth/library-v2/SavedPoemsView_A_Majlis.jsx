import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Trash2, MoreHorizontal, Pin } from 'lucide-react';
import { formatRelative, ROMAN, firstTwoLines } from './utils.js';

/**
 * Library v2 · Option A — Majlis (مَجلِس)
 *
 * A quiet, library-of-rare-books reading sheet.  One column of
 * editorial "leaves" with Roman numerals, a gold rule, and a swipe-to-remove
 * gesture on touch devices.  Bold display title in Reem Kufi sets the tone.
 *
 * Coherence with the app:
 *   • Uses THEME tokens via the `theme` prop (gold titles, glass surfaces).
 *   • Reem Kufi for titles, Amiri for excerpts, Fustat for poet,
 *     Bodoni Moda for italic English meta — same as the main poem view.
 *   • Light + dark variants share one component.
 */
const SavedPoemsView_A_Majlis = ({
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
  const [swipeId, setSwipeId] = useState(null); // id whose swipe-action is revealed
  const [pinnedIds, setPinnedIds] = useState(() => new Set());
  const startX = useRef(0);
  const startId = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const poets = Array.from(new Set(savedPoems.map((p) => p.poet).filter(Boolean)));

  const filtered = savedPoems.filter((p) => {
    if (activePoet !== 'all' && p.poet !== activePoet) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.poet || '').toLowerCase().includes(q) ||
      (p.poem_text || '').toLowerCase().includes(q) ||
      (p.english || '').toLowerCase().includes(q)
    );
  });

  const togglePin = (id) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSwipeId(null);
  };

  // Touch swipe-to-remove handlers (mobile only — pointer events also catch trackpad)
  const onPointerDown = (e, id) => {
    if (e.pointerType !== 'touch') return;
    startX.current = e.clientX;
    startId.current = id;
  };
  const onPointerMove = (e) => {
    if (e.pointerType !== 'touch' || startId.current == null) return;
    const dx = e.clientX - startX.current;
    if (dx < -40) setSwipeId(startId.current);
    else if (dx > 20) setSwipeId(null);
  };
  const onPointerUp = () => {
    startId.current = null;
  };

  const sceneBg = darkMode
    ? 'radial-gradient(circle at 50% 0%, rgba(197,160,89,0.10) 0%, transparent 55%), #0c0c0e'
    : 'radial-gradient(circle at 50% 0%, rgba(197,160,89,0.08) 0%, transparent 55%), #FDFCF8';

  return (
    <motion.div
      key="majlis"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: sceneBg }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),18px)] pb-2 md:px-8 md:pt-6">
        <button
          onClick={onClose}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/5 active:bg-white/10 transition-colors"
          aria-label="Close library"
        >
          <X size={20} className={theme.text} />
        </button>
        <span
          className={`font-brand-en text-[11px] tracking-[0.18em] uppercase ${theme.text} opacity-50`}
        >
          Library · المكتبة
        </span>
        <button
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
          aria-label="More"
        >
          <MoreHorizontal size={18} className={`${theme.text} opacity-70`} />
        </button>
      </header>

      {/* Hero */}
      <div className="text-center px-6 pt-2 pb-4 md:pt-6">
        <div
          style={{ fontFamily: "'Forum', serif" }}
          className="text-[10px] md:text-[11px] tracking-[0.32em] uppercase text-gold opacity-90 mb-2 md:mb-3"
        >
          My Majlis · مَجلِسي
        </div>
        <h1
          dir="rtl"
          style={{
            fontFamily: "'Reem Kufi', sans-serif",
            fontWeight: 700,
            fontSize: 'clamp(2.25rem, 7vw, 3.75rem)',
            lineHeight: 1.05,
            color: 'var(--gold)',
            textShadow: darkMode
              ? '0 0 32px rgba(197,160,89,0.25), 0 0 12px rgba(197,160,89,0.10)'
              : 'none',
          }}
        >
          قَصائِدي المَحفوظَة
        </h1>
        <p
          className={`${theme.text} opacity-60 mt-2 md:mt-3`}
          style={{
            fontFamily: "'Bodoni Moda', serif",
            fontStyle: 'italic',
            fontSize: 'clamp(0.75rem, 1.4vw, 0.95rem)',
            letterSpacing: '0.01em',
          }}
        >
          A private majlis of poems you&rsquo;ve kept close
        </p>
        {savedPoems.length > 0 && (
          <div
            className="inline-flex items-center gap-2 mt-4 md:mt-5 px-3 py-1.5 rounded-full border border-gold/25"
            style={{
              background: 'rgba(197,160,89,0.10)',
              fontFamily: "'Bodoni Moda', serif",
              fontStyle: 'italic',
              fontSize: '11px',
              color: 'var(--gold)',
            }}
          >
            <span>{savedPoems.length} poems</span>
            <span className="w-[3px] h-[3px] rounded-full bg-gold/60" />
            <span>{poets.length} poets</span>
            {savedPoems[0]?.saved_at && (
              <>
                <span className="w-[3px] h-[3px] rounded-full bg-gold/60" />
                <span>{formatRelative(savedPoems[0].saved_at)}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-4 md:px-8">
        <div
          className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl border ${theme.border} ${darkMode ? 'bg-white/[0.04]' : 'bg-black/[0.03]'}`}
        >
          <Search size={14} className={`${theme.text} opacity-50`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search saved · ابحث في قصائدك"
            className={`flex-1 bg-transparent outline-none text-sm ${theme.text} placeholder:opacity-40`}
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          />
        </div>
      </div>

      {/* Poet chips */}
      {poets.length > 0 && (
        <div className="flex gap-1.5 px-4 md:px-8 pt-3 pb-1 overflow-x-auto custom-scrollbar-hide">
          {[{ id: 'all', label: 'All · الكل' }, ...poets.map((p) => ({ id: p, label: p }))].map(
            (chip) => {
              const active = activePoet === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActivePoet(chip.id)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
                    active
                      ? 'border border-gold/45 bg-gold/12 text-gold'
                      : `border ${theme.border} ${theme.text} opacity-65 hover:opacity-100`
                  }`}
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  {chip.label}
                </button>
              );
            }
          )}
        </div>
      )}

      {/* Leaf list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 pt-3 pb-[max(env(safe-area-inset-bottom),24px)]">
        <div className="max-w-2xl mx-auto space-y-3 md:space-y-4">
          {filtered.length === 0 ? (
            <EmptyState theme={theme} />
          ) : (
            filtered.map((sp, idx) => (
              <Leaf
                key={sp.id || idx}
                sp={sp}
                index={idx}
                darkMode={darkMode}
                theme={theme}
                isSwiped={swipeId === sp.id}
                isPinned={pinnedIds.has(sp.id)}
                onPointerDown={(e) => onPointerDown(e, sp.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onClickRemove={() => {
                  setSwipeId(null);
                  onUnsavePoem?.(sp);
                }}
                onClickPin={() => togglePin(sp.id)}
                onClickReset={() => setSwipeId(null)}
                onSelect={() => onSelectPoem?.(sp)}
              />
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

const Leaf = ({
  sp,
  index,
  darkMode,
  theme,
  isSwiped,
  isPinned,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClickRemove,
  onClickPin,
  onClickReset,
  onSelect,
}) => {
  const excerpt = firstTwoLines(sp.poem_text || '');

  // Swipe reveals a 176px area: Pin (lapis) + Remove (red)
  const SWIPE_W = 176;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe-revealed actions behind the card (Pin + Remove) */}
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: SWIPE_W }}
        aria-hidden="true"
      >
        <button
          onClick={onClickPin}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-lapis text-white"
        >
          <Pin size={18} />
          <span className="text-[10px] tracking-[0.05em] font-medium">
            {isPinned ? 'Unpin' : 'Pin'}
          </span>
        </button>
        <button
          onClick={onClickRemove}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 text-white"
        >
          <Trash2 size={18} />
          <span className="text-[10px] tracking-[0.05em] font-medium">Remove</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        <motion.button
          key={sp.id || index}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, x: isSwiped ? -SWIPE_W : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1], delay: index * 0.03 }}
          onClick={isSwiped ? onClickReset : onSelect}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative w-full text-left rounded-2xl p-4 md:p-5 border ${theme.border} hover:border-gold/30 transition-colors`}
          style={{
            touchAction: 'pan-y',
            // Fully opaque so swipe actions don't bleed through
            background: darkMode ? '#18161e' : 'rgba(253,252,248,0.97)',
          }}
        >
          {/* Top gold rule */}
          <span
            aria-hidden
            className="absolute top-0 left-4 right-4 md:left-5 md:right-5 h-px"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(197,160,89,0.4), transparent)',
            }}
          />
          <div
            style={{ fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic' }}
            className="text-[11px] text-gold opacity-70 mb-1"
          >
            {ROMAN[index] || `${index + 1}.`}
          </div>
          <div
            dir="rtl"
            style={{
              fontFamily: "'Reem Kufi', sans-serif",
              fontWeight: 600,
              fontSize: 'clamp(1.1rem, 2.4vw, 1.4rem)',
              lineHeight: 1.3,
              color: 'var(--gold)',
            }}
          >
            {sp.title || '—'}
          </div>
          <div
            dir="rtl"
            style={{ fontFamily: "'Fustat', sans-serif", fontSize: '0.85rem' }}
            className={darkMode ? 'text-[#D4D0C8] opacity-80 mt-0.5' : 'text-[#6B5C3E] mt-0.5'}
          >
            {sp.poet || 'Unknown'}
          </div>

          {/* Short gold rule */}
          <span
            aria-hidden
            className="block w-11 h-px my-3"
            style={{
              background: 'linear-gradient(90deg, var(--gold) 0%, transparent 100%)',
            }}
          />

          {excerpt && (
            <p
              dir="rtl"
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: 'clamp(0.95rem, 1.8vw, 1.05rem)',
                lineHeight: 1.95,
              }}
              className={`${theme.text} opacity-85`}
            >
              {excerpt}
            </p>
          )}

          <div
            className={`mt-3 flex items-center justify-between text-[10px] ${theme.text} opacity-50`}
          >
            <span style={{ fontFamily: "'Tajawal', sans-serif" }}>
              {sp.saved_at ? formatRelative(sp.saved_at) : ''}
            </span>
            <div className="flex items-center gap-2">
              {isPinned && (
                <Pin size={10} className="text-gold opacity-70" />
              )}
              {sp.category && (
                <span
                  className="px-2 py-0.5 rounded text-gold opacity-90"
                  style={{
                    background: 'rgba(197,160,89,0.10)',
                    fontFamily: "'Tajawal', sans-serif",
                    fontSize: '10px',
                    letterSpacing: '0.04em',
                  }}
                >
                  {sp.category}
                </span>
              )}
            </div>
          </div>

          {/* Swipe hint (mobile only, fades once swiped) */}
          {!isSwiped && (
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none md:hidden"
              style={{ opacity: 0.18 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </div>
          )}
        </motion.button>
      </AnimatePresence>
    </div>
  );
};

const EmptyState = ({ theme }) => (
  <div className="text-center py-20">
    <div
      style={{ fontFamily: "'Forum', serif" }}
      className="text-[10px] tracking-[0.32em] uppercase text-gold opacity-70 mb-3"
    >
      An empty majlis
    </div>
    <p
      dir="rtl"
      className={`${theme.text} opacity-60`}
      style={{ fontFamily: "'Amiri', serif", fontSize: '1.1rem' }}
    >
      لا توجد قصائد محفوظة بعد
    </p>
    <p
      className={`${theme.text} opacity-30 mt-2`}
      style={{ fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic', fontSize: '12px' }}
    >
      Tap the heart on any poem to keep it close.
    </p>
  </div>
);

export default SavedPoemsView_A_Majlis;
