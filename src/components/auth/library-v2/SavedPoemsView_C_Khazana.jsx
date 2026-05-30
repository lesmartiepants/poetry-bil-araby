import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pin, Trash2, Search } from 'lucide-react';
import { formatRelative, firstLine, groupByRecency } from './utils.js';

/**
 * Library v2 · Option C — Khazana (خَزانَة)
 *
 * The library is a bottom sheet with three snap points (peek 18% / half 60% /
 * full 96%).  The currently-reading poem stays softly visible behind a scrim.
 * Pinned cards live in a horizontal scroll strip; rows are grouped
 * Today / This week / Earlier and expose iOS-native trailing swipe actions
 * (Pin · Remove) — exactly like Mail / Messages.
 *
 * Snap state survives across opens via localStorage so power users keep their
 * preferred working height.
 */
const SNAP_KEY = 'libraryV2.khazana.snap';
const SNAPS = { peek: 0.18, half: 0.6, full: 0.96 };
const SNAP_ORDER = ['peek', 'half', 'full'];

const SavedPoemsView_C_Khazana = ({
  isOpen,
  onClose,
  savedPoems = [],
  onSelectPoem,
  onUnsavePoem,
  theme,
  darkMode = true,
  currentPoem,
}) => {
  const [snap, setSnap] = useState(() => {
    if (typeof localStorage === 'undefined') return 'half';
    return localStorage.getItem(SNAP_KEY) || 'half';
  });
  const [pinnedIds, setPinnedIds] = useState(() => new Set());
  const [swipeId, setSwipeId] = useState(null);
  const [query, setQuery] = useState('');
  const startX = useRef(0);
  const startId = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(SNAP_KEY, snap);
  }, [snap]);

  if (!isOpen) return null;

  const cycleSnap = () => {
    const idx = SNAP_ORDER.indexOf(snap);
    setSnap(SNAP_ORDER[(idx + 1) % SNAP_ORDER.length]);
  };

  const togglePin = (id) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSwipeId(null);
  };

  const filtered = !query.trim()
    ? savedPoems
    : savedPoems.filter((p) => {
        const q = query.trim().toLowerCase();
        return (
          (p.title || '').toLowerCase().includes(q) ||
          (p.poet || '').toLowerCase().includes(q) ||
          (p.poem_text || '').toLowerCase().includes(q)
        );
      });

  const pinned = filtered.filter((p) => pinnedIds.has(p.id));
  const unpinned = filtered.filter((p) => !pinnedIds.has(p.id));
  const groups = groupByRecency(unpinned);

  // Drag handle gesture: drag up to grow, down to shrink/dismiss
  const handleDragEnd = (_e, info) => {
    const dy = info.offset.y;
    const v = info.velocity.y;
    if (dy > 140 || v > 600) {
      // dragging down
      const idx = SNAP_ORDER.indexOf(snap);
      if (idx === 0) onClose();
      else setSnap(SNAP_ORDER[idx - 1]);
    } else if (dy < -80 || v < -400) {
      const idx = SNAP_ORDER.indexOf(snap);
      if (idx < SNAP_ORDER.length - 1) setSnap(SNAP_ORDER[idx + 1]);
    }
  };

  // Per-row pointer-based swipe
  const onPointerDown = (e, id) => {
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
    startX.current = e.clientX;
    startId.current = id;
  };
  const onPointerMove = (e) => {
    if (startId.current == null) return;
    const dx = e.clientX - startX.current;
    if (dx < -50) setSwipeId(startId.current);
    else if (dx > 30) setSwipeId(null);
  };
  const onPointerUp = () => {
    startId.current = null;
  };

  const sheetHeight = `${Math.round(SNAPS[snap] * 100)}vh`;

  return (
    <motion.div
      key="khazana"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Background — currently reading poem (subtle) */}
      <div className="absolute inset-0 pointer-events-none">
        {currentPoem?.arabic && (
          <div
            dir="rtl"
            className="px-8 pt-[max(env(safe-area-inset-top),48px)] text-center"
            style={{
              opacity: snap === 'full' ? 0 : 0.42,
              transition: 'opacity 240ms ease',
              color: darkMode ? 'var(--gold)' : '#8a6f2f',
            }}
          >
            <div
              style={{ fontFamily: "'Forum', serif" }}
              className={`text-[10px] tracking-[0.32em] uppercase ${theme.text} opacity-60 mb-5`}
            >
              Currently reading
            </div>
            <div
              style={{
                fontFamily: "'Amiri', serif",
                fontSize: 'clamp(1.1rem, 2.4vw, 1.4rem)',
                lineHeight: 2.2,
              }}
            >
              {currentPoem.arabic.split('\n').slice(0, 2).join('\n')}
            </div>
            {currentPoem.poet && (
              <div
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontSize: '12px',
                  letterSpacing: '0.1em',
                  marginTop: 14,
                  opacity: 0.7,
                }}
              >
                {currentPoem.poet}
                {currentPoem.title ? ' · ' + currentPoem.title : ''}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrim */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: darkMode
            ? 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 35%, rgba(0,0,0,0.55) 60%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(28,25,23,0.18) 35%, rgba(28,25,23,0.32) 60%)',
        }}
      />

      {/* Bottom sheet */}
      <motion.section
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.14}
        onDragEnd={handleDragEnd}
        initial={false}
        animate={{ height: sheetHeight }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
        className={`absolute bottom-0 left-0 right-0 rounded-t-[28px] overflow-hidden border-t ${theme.border} flex flex-col`}
        style={{
          background: darkMode ? 'rgba(20, 19, 26, 0.92)' : 'rgba(253, 252, 248, 0.94)',
          backdropFilter: 'blur(40px) saturate(160%)',
          boxShadow: darkMode
            ? '0 -20px 60px rgba(0,0,0,0.55)'
            : '0 -20px 60px rgba(28,25,23,0.18)',
        }}
      >
        {/* Drag handle */}
        <button
          onClick={cycleSnap}
          className="mx-auto mt-2 mb-1 w-9 h-[5px] rounded-full"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.22)',
          }}
          aria-label="Resize sheet"
        />

        {/* Header */}
        <header
          className={`px-5 pb-3 border-b ${theme.border} flex items-end justify-between gap-3`}
        >
          <div className="flex-1 min-w-0">
            <div
              style={{ fontFamily: "'Forum', serif" }}
              className="text-[10px] tracking-[0.3em] uppercase text-gold opacity-90 mb-1"
            >
              Khazana · خَزانَة
            </div>
            <div
              dir="rtl"
              style={{
                fontFamily: "'Reem Kufi', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(1.4rem, 4vw, 1.75rem)',
                color: 'var(--gold)',
                lineHeight: 1,
              }}
            >
              قَصائِدي
            </div>
            <div
              className={`${theme.text} opacity-60 mt-1`}
              style={{
                fontFamily: "'Bodoni Moda', serif",
                fontStyle: 'italic',
                fontSize: 11,
              }}
            >
              My treasury of saved poems
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center border ${theme.border} ${darkMode ? 'bg-white/[0.06]' : 'bg-black/[0.04]'} ${theme.text} opacity-80 hover:opacity-100`}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>

        {/* Stats */}
        <div
          className={`flex gap-4 px-5 pt-2 text-[11px] ${theme.text} opacity-60`}
          style={{ fontFamily: "'Tajawal', sans-serif" }}
        >
          <span>
            <strong className="text-gold text-[13px]">{savedPoems.length}</strong> poems
          </span>
          <span>
            <strong className="text-gold text-[13px]">
              {new Set(savedPoems.map((p) => p.poet).filter(Boolean)).size}
            </strong>{' '}
            poets
          </span>
          <span>
            <strong className="text-gold text-[13px]">{pinnedIds.size}</strong> pinned
          </span>
        </div>

        {/* Search (only visible at half/full) */}
        {snap !== 'peek' && (
          <div className="px-5 pt-3">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme.border} ${darkMode ? 'bg-white/[0.04]' : 'bg-black/[0.03]'}`}
            >
              <Search size={13} className={`${theme.text} opacity-50`} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search treasury…"
                className={`flex-1 bg-transparent outline-none text-sm ${theme.text} placeholder:opacity-40`}
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              />
            </div>
          </div>
        )}

        {/* Pinned strip */}
        {pinned.length > 0 && (
          <>
            <SectionLabel theme={theme} en="Pinned" ar="مُثَبَّت" icon={Pin} />
            <div className="flex gap-2 px-3.5 pb-1 overflow-x-auto custom-scrollbar-hide">
              {pinned.map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => onSelectPoem?.(sp)}
                  className="flex-shrink-0 w-[156px] p-3 rounded-2xl border border-gold/30 text-right"
                  style={{
                    background:
                      'linear-gradient(160deg, rgba(197,160,89,0.10) 0%, rgba(197,160,89,0.02) 100%)',
                  }}
                  dir="rtl"
                >
                  <span
                    className="inline-flex items-center gap-1 text-gold"
                    style={{
                      fontFamily: "'Bodoni Moda', serif",
                      fontStyle: 'italic',
                      fontSize: 9,
                      letterSpacing: '0.06em',
                    }}
                  >
                    <Pin size={9} /> Pinned
                  </span>
                  <div
                    style={{
                      fontFamily: "'Reem Kufi', sans-serif",
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--gold)',
                      lineHeight: 1.3,
                      marginTop: 4,
                    }}
                    className="truncate"
                  >
                    {sp.title || '—'}
                  </div>
                  <div
                    style={{ fontFamily: "'Fustat', sans-serif", fontSize: 11 }}
                    className={`${darkMode ? 'text-[#D4D0C8] opacity-80' : 'text-[#6B5C3E]'} mt-0.5 truncate`}
                  >
                    {sp.poet || ''}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Time-grouped rows */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pb-[max(env(safe-area-inset-bottom),24px)]">
          {groups.length === 0 && pinned.length === 0 ? (
            <EmptyState theme={theme} />
          ) : (
            groups.map((group) => (
              <div key={group.id}>
                <SectionLabel theme={theme} en={group.label} ar={group.labelAr} />
                {group.items.map((sp) => (
                  <Row
                    key={sp.id}
                    sp={sp}
                    darkMode={darkMode}
                    theme={theme}
                    swiped={swipeId === sp.id}
                    pinned={pinnedIds.has(sp.id)}
                    onSelect={() => {
                      if (swipeId) setSwipeId(null);
                      else onSelectPoem?.(sp);
                    }}
                    onPin={() => togglePin(sp.id)}
                    onRemove={() => {
                      setSwipeId(null);
                      onUnsavePoem?.(sp);
                    }}
                    onPointerDown={(e) => onPointerDown(e, sp.id)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      </motion.section>
    </motion.div>
  );
};

const SectionLabel = ({ theme, en, ar, icon: Icon }) => (
  <div
    className="flex items-center gap-2 px-5 pt-3 pb-2"
    style={{
      fontFamily: "'Forum', serif",
      fontSize: 10,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      color: 'var(--gold)',
      opacity: 0.85,
    }}
  >
    {Icon && <Icon size={10} />}
    <span>
      {en}
      {ar ? ' · ' + ar : ''}
    </span>
    <span
      className="flex-1 h-px ml-1"
      style={{
        background: 'linear-gradient(90deg, rgba(197,160,89,0.3), transparent)',
      }}
    />
    <span
      className={`opacity-60 ${theme.text}`}
      style={{ fontSize: 10, letterSpacing: '0.05em' }}
    />
  </div>
);

const Row = ({
  sp,
  darkMode,
  theme,
  swiped,
  pinned,
  onSelect,
  onPin,
  onRemove,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const excerpt = firstLine(sp.poem_text || '');
  return (
    <div className="relative overflow-hidden">
      {/* Trailing actions revealed on swipe */}
      <div className="absolute top-0 right-0 bottom-0 w-32 grid grid-cols-2 text-white">
        <button
          onClick={onPin}
          className="flex flex-col items-center justify-center gap-1 bg-lapis"
          style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 10, fontWeight: 600 }}
        >
          <Pin size={16} />
          {pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          onClick={onRemove}
          className="flex flex-col items-center justify-center gap-1 bg-red-500"
          style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 10, fontWeight: 600 }}
        >
          <Trash2 size={16} />
          Remove
        </button>
      </div>

      <AnimatePresence initial={false}>
        <motion.button
          key={sp.id}
          animate={{ x: swiped ? -128 : 0 }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          onClick={onSelect}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={`relative w-full px-5 py-3 flex items-stretch gap-2.5 text-right border-b ${darkMode ? 'border-white/[0.04]' : 'border-black/[0.05]'}`}
          style={{
            // Fully opaque so the lapis/red action buttons behind don't bleed through
            background: darkMode ? '#14131A' : '#FDFCF8',
            touchAction: 'pan-y',
          }}
          dir="rtl"
        >
          <span
            aria-hidden
            className="block w-[3px] rounded-sm bg-gold flex-shrink-0"
            style={{ opacity: pinned ? 1 : 0.5 }}
          />
          <span className="flex-1 min-w-0">
            <span className="flex items-baseline justify-between gap-2">
              <span
                className="block truncate"
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontWeight: 600,
                  fontSize: 15,
                  color: 'var(--gold)',
                }}
              >
                {sp.title || '—'}
              </span>
              <span
                className={`flex-shrink-0 ${theme.text} opacity-50`}
                style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 11 }}
              >
                {sp.saved_at ? formatRelative(sp.saved_at) : ''}
              </span>
            </span>
            <span
              className={`block truncate mt-0.5 ${darkMode ? 'text-[#D4D0C8] opacity-70' : 'text-[#6B5C3E]'}`}
              style={{ fontFamily: "'Fustat', sans-serif", fontSize: 11 }}
            >
              {sp.poet || ''}
            </span>
            {excerpt && (
              <span
                className={`block truncate mt-1 ${theme.text} opacity-60`}
                style={{ fontFamily: "'Amiri', serif", fontSize: 12 }}
              >
                {excerpt}
              </span>
            )}
          </span>
        </motion.button>
      </AnimatePresence>
    </div>
  );
};

const EmptyState = ({ theme }) => (
  <div className="text-center py-14 px-6">
    <p
      dir="rtl"
      className={`${theme.text} opacity-60`}
      style={{ fontFamily: "'Amiri', serif", fontSize: '1.05rem' }}
    >
      الخَزانة فارغة
    </p>
    <p
      className={`${theme.text} opacity-30 mt-2`}
      style={{ fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic', fontSize: '12px' }}
    >
      Save a poem and it will rest here.
    </p>
  </div>
);

export default SavedPoemsView_C_Khazana;
