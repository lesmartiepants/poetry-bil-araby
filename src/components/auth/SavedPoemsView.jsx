import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Pin,
  PinOff,
  Trash2,
  Search,
  Share2,
  Check,
  ChevronDown,
  ListChecks,
  Heart,
} from 'lucide-react';

/**
 * SavedPoemsView — قَصائدي · The Khazana (خَزانَة)
 *
 * A bottom-sheet drawer (matching the app-wide drawer framework used by
 * DiscoverDrawer / InsightsDrawer) that hosts the user's saved-poem library.
 *
 * Features
 *   • Drag-handle dismiss + ESC close, backdrop-tap close
 *   • Live search over title / poet / verse text
 *   • Sort: Recent · Oldest · Title (A→Z) · Poet (A→Z)
 *   • Pinned strip with one-tap **unpin** (`PinOff` chip on each card)
 *   • Multi-select mode: tap a row to toggle, then bulk Pin/Unpin · Share · Remove
 *   • Per-row swipe-to-reveal Pin/Remove on touch
 *   • Share routes through the existing ShareCardModal via `onSharePoem`
 *   • Guarded deletes — every destructive action confirms first
 *
 * Pin state is persisted locally (poem.id → boolean) under
 * `library.pinned.v1`.  No DB schema change is required.
 */

const PIN_LS_KEY = 'library.pinned.v1';

const SORTS = [
  { id: 'recent', label: 'Recently saved', labelAr: 'الأحدث' },
  { id: 'oldest', label: 'Oldest first', labelAr: 'الأقدم' },
  { id: 'title', label: 'Title (A→Z)', labelAr: 'العنوان' },
  { id: 'poet', label: 'Poet (A→Z)', labelAr: 'الشاعر' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────
const formatRelative = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
};

const firstLine = (text = '') => (text.split('\n')[0] || '').trim();

const groupByRecency = (poems) => {
  const today = [];
  const thisWeek = [];
  const earlier = [];
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  poems.forEach((p) => {
    const t = p.saved_at ? new Date(p.saved_at).getTime() : 0;
    const ageDays = (now - t) / dayMs;
    if (ageDays < 1) today.push(p);
    else if (ageDays < 7) thisWeek.push(p);
    else earlier.push(p);
  });
  return [
    { id: 'today', label: 'Today', labelAr: 'اليوم', items: today },
    { id: 'week', label: 'This week', labelAr: 'هذا الأسبوع', items: thisWeek },
    { id: 'earlier', label: 'Earlier', labelAr: 'سابقاً', items: earlier },
  ].filter((g) => g.items.length > 0);
};

const loadPinned = () => {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(PIN_LS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};

const savePinned = (set) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PIN_LS_KEY, JSON.stringify([...set]));
  } catch {
    /* quota / private mode — non-fatal */
  }
};

// ─── Main component ───────────────────────────────────────────────────────
const SavedPoemsView = ({
  isOpen,
  onClose,
  savedPoems = [],
  onSelectPoem,
  onUnsavePoem,
  onSharePoem,
  theme,
  darkMode = true,
}) => {
  const [query, setQuery] = useState('');
  const [sortId, setSortId] = useState('recent');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [pinnedIds, setPinnedIds] = useState(loadPinned);
  const [swipeId, setSwipeId] = useState(null);
  const startX = useRef(0);
  const startId = useRef(null);
  const sortBtnRef = useRef(null);

  // Persist pin changes
  useEffect(() => {
    savePinned(pinnedIds);
  }, [pinnedIds]);

  // ESC closes (or exits select-mode first)
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (selectMode) {
        setSelectMode(false);
        setSelectedIds(new Set());
      } else if (sortMenuOpen) {
        setSortMenuOpen(false);
      } else {
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, selectMode, sortMenuOpen]);

  // Reset transient UI state whenever drawer closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectMode(false);
      setSelectedIds(new Set());
      setSwipeId(null);
      setSortMenuOpen(false);
    }
  }, [isOpen]);

  // Close sort menu on outside click
  useEffect(() => {
    if (!sortMenuOpen) return undefined;
    const onDown = (e) => {
      if (sortBtnRef.current && !sortBtnRef.current.contains(e.target)) {
        setSortMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [sortMenuOpen]);

  // Filter + sort
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? savedPoems
      : savedPoems.filter(
          (p) =>
            (p.title || '').toLowerCase().includes(q) ||
            (p.poet || '').toLowerCase().includes(q) ||
            (p.poem_text || '').toLowerCase().includes(q)
        );

    const arr = [...base];
    if (sortId === 'oldest') {
      arr.sort((a, b) => new Date(a.saved_at || 0) - new Date(b.saved_at || 0));
    } else if (sortId === 'title') {
      arr.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ar'));
    } else if (sortId === 'poet') {
      arr.sort((a, b) => (a.poet || '').localeCompare(b.poet || '', 'ar'));
    } else {
      // recent
      arr.sort((a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0));
    }
    return arr;
  }, [savedPoems, query, sortId]);

  const pinned = useMemo(() => filtered.filter((p) => pinnedIds.has(p.id)), [filtered, pinnedIds]);
  const unpinned = useMemo(
    () => filtered.filter((p) => !pinnedIds.has(p.id)),
    [filtered, pinnedIds]
  );
  // Time groups only make sense for the recent sort; other sorts get a flat list.
  const showGroups = sortId === 'recent' && !query.trim();
  const groups = useMemo(
    () =>
      showGroups
        ? groupByRecency(unpinned)
        : [{ id: 'all', label: null, labelAr: null, items: unpinned }],
    [showGroups, unpinned]
  );

  if (!isOpen) return null;

  // ─── Pin / select / swipe handlers ─────────────────────────────────────
  const togglePin = (id) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSwipeId(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleRowTap = (sp) => {
    if (selectMode) {
      toggleSelect(sp.id);
      return;
    }
    if (swipeId) {
      setSwipeId(null);
      return;
    }
    onSelectPoem?.(sp);
  };

  const handleRemoveSingle = (sp) => {
    const title = sp.title || sp.poet || 'this poem';
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Remove "${title}" from your saved library?`)
    ) {
      return;
    }
    setSwipeId(null);
    // Drop any stale pin entry too
    setPinnedIds((prev) => {
      if (!prev.has(sp.id)) return prev;
      const next = new Set(prev);
      next.delete(sp.id);
      return next;
    });
    onUnsavePoem?.(sp);
  };

  const handleBulkRemove = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Remove ${ids.length} poem${ids.length === 1 ? '' : 's'} from your saved library? This cannot be undone.`
      )
    ) {
      return;
    }
    const byId = new Map(savedPoems.map((p) => [p.id, p]));
    setPinnedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
    ids.forEach((id) => {
      const sp = byId.get(id);
      if (sp) onUnsavePoem?.(sp);
    });
    exitSelectMode();
  };

  const handleBulkPin = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    // If every selection is pinned, treat as unpin-all; else pin-all.
    const allPinned = ids.every((id) => pinnedIds.has(id));
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (allPinned) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleShareRow = (sp) => {
    setSwipeId(null);
    if (onSharePoem) onSharePoem(sp);
  };

  // Touch-swipe (per row): drag left ≥50px reveals trailing actions.
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

  const subtleBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const cardBg = darkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)';
  const safeTheme = theme || {
    text: darkMode ? 'text-white' : 'text-stone-900',
    border: darkMode ? 'border-white/10' : 'border-black/10',
  };
  const currentSort = SORTS.find((s) => s.id === sortId) || SORTS[0];

  return (
    <AnimatePresence>
      <motion.div
        key="khazana-backdrop"
        className="fixed inset-0 z-[201] bg-black/55 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
      />

      <motion.section
        key="khazana-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Saved poems library"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.18}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 140 || info.velocity.y > 600) onClose?.();
        }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        className={`fixed bottom-0 left-0 right-0 z-[202] rounded-t-3xl flex flex-col overflow-hidden border-t ${safeTheme.border}`}
        style={{
          height: '90dvh',
          background: darkMode
            ? 'linear-gradient(180deg, rgba(18,16,12,0.99) 0%, rgba(12,12,14,1) 100%)'
            : 'linear-gradient(180deg, rgba(253,252,248,0.99) 0%, rgba(245,243,238,1) 100%)',
          borderTopColor: 'rgba(197,160,89,0.22)',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gold/25" />
        </div>

        {/* Header */}
        <header className="relative px-5 pt-1 pb-3 flex-shrink-0">
          <div
            style={{ fontFamily: "'Forum', serif" }}
            className="text-[10px] tracking-[0.3em] uppercase text-gold opacity-80"
          >
            Khazana · خَزانَة
          </div>
          <div className="flex items-end justify-between gap-3 mt-1">
            <div className="flex-1 min-w-0">
              <h2
                dir="rtl"
                className="font-amiri leading-none"
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(1.4rem, 4vw, 1.75rem)',
                  color: 'var(--gold)',
                }}
              >
                قصائدي المحفوظة
              </h2>
              <p
                className={`mt-1 ${safeTheme.text} opacity-60`}
                style={{ fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic', fontSize: 11 }}
              >
                {savedPoems.length} saved · {pinnedIds.size} pinned
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close saved poems"
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{
                background: 'rgba(197,160,89,0.08)',
                border: '1px solid rgba(197,160,89,0.18)',
              }}
            >
              <X size={14} style={{ color: 'var(--gold)', opacity: 0.8 }} />
            </button>
          </div>
        </header>

        {/* Toolbar — search · sort · select */}
        {savedPoems.length > 0 && (
          <div className="px-5 pb-2 flex items-center gap-2 flex-shrink-0">
            <div
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border ${safeTheme.border}`}
              style={{ background: cardBg, borderColor: subtleBorder }}
            >
              <Search size={13} className={`${safeTheme.text} opacity-50`} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved · ابحث في قصائدك"
                className={`flex-1 bg-transparent outline-none text-sm ${safeTheme.text} placeholder:opacity-40`}
                style={{ fontFamily: "'Tajawal', sans-serif" }}
              />
            </div>

            <div className="relative" ref={sortBtnRef}>
              <button
                type="button"
                onClick={() => setSortMenuOpen((v) => !v)}
                aria-label="Sort saved poems"
                aria-expanded={sortMenuOpen}
                className={`h-[34px] px-3 flex items-center gap-1.5 rounded-xl border text-xs ${safeTheme.text}`}
                style={{
                  background: cardBg,
                  borderColor: subtleBorder,
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                <span className="opacity-80">{currentSort.label}</span>
                <ChevronDown size={12} className="opacity-60" />
              </button>
              {sortMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-1 min-w-[180px] rounded-xl border overflow-hidden z-10"
                  style={{
                    background: darkMode ? 'rgba(20,18,15,0.98)' : 'rgba(253,252,248,0.98)',
                    borderColor: subtleBorder,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                  }}
                >
                  {SORTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={sortId === s.id}
                      onClick={() => {
                        setSortId(s.id);
                        setSortMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 flex items-center justify-between text-xs ${safeTheme.text} hover:bg-gold/10`}
                      style={{ fontFamily: "'Tajawal', sans-serif" }}
                    >
                      <span>{s.label}</span>
                      {sortId === s.id && <Check size={12} className="text-gold" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectMode) exitSelectMode();
                else setSelectMode(true);
              }}
              aria-pressed={selectMode}
              aria-label={selectMode ? 'Exit multi-select' : 'Enter multi-select'}
              className={`h-[34px] px-3 flex items-center gap-1.5 rounded-xl border text-xs ${safeTheme.text}`}
              style={{
                background: selectMode ? 'rgba(197,160,89,0.16)' : cardBg,
                borderColor: selectMode ? 'rgba(197,160,89,0.45)' : subtleBorder,
                fontFamily: "'Tajawal', sans-serif",
                color: selectMode ? 'var(--gold)' : undefined,
              }}
            >
              <ListChecks size={13} />
              <span className="opacity-90">{selectMode ? 'Done' : 'Select'}</span>
            </button>
          </div>
        )}

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden pb-[max(env(safe-area-inset-bottom),24px)]"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(197,160,89,0.2) transparent' }}
        >
          {savedPoems.length === 0 ? (
            <EmptyState theme={safeTheme} />
          ) : filtered.length === 0 ? (
            <EmptyResults theme={safeTheme} query={query} />
          ) : (
            <>
              {pinned.length > 0 && (
                <>
                  <SectionLabel en="Pinned" ar="مُثَبَّت" icon={Pin} theme={safeTheme} />
                  <div
                    className="flex gap-2 px-3.5 pb-2 overflow-x-auto"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {pinned.map((sp) => (
                      <PinnedCard
                        key={sp.id}
                        sp={sp}
                        darkMode={darkMode}
                        selectMode={selectMode}
                        selected={selectedIds.has(sp.id)}
                        onTap={() => handleRowTap(sp)}
                        onUnpin={() => togglePin(sp.id)}
                      />
                    ))}
                  </div>
                </>
              )}

              {groups.map((group) => (
                <div key={group.id}>
                  {group.label && (
                    <SectionLabel en={group.label} ar={group.labelAr} theme={safeTheme} />
                  )}
                  {group.items.map((sp) => (
                    <Row
                      key={sp.id}
                      sp={sp}
                      darkMode={darkMode}
                      theme={safeTheme}
                      pinned={pinnedIds.has(sp.id)}
                      swiped={swipeId === sp.id}
                      selectMode={selectMode}
                      selected={selectedIds.has(sp.id)}
                      canShare={!!onSharePoem}
                      onTap={() => handleRowTap(sp)}
                      onPin={() => togglePin(sp.id)}
                      onShare={() => handleShareRow(sp)}
                      onRemove={() => handleRemoveSingle(sp)}
                      onPointerDown={(e) => onPointerDown(e, sp.id)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Multi-select action bar */}
        <AnimatePresence>
          {selectMode && selectedIds.size > 0 && (
            <motion.div
              key="bulkbar"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="absolute bottom-0 left-0 right-0 px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2"
              style={{
                background: darkMode
                  ? 'linear-gradient(180deg, rgba(18,16,12,0) 0%, rgba(18,16,12,0.96) 30%)'
                  : 'linear-gradient(180deg, rgba(253,252,248,0) 0%, rgba(253,252,248,0.96) 30%)',
              }}
            >
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border ${safeTheme.border}`}
                style={{
                  background: darkMode ? 'rgba(28,25,20,0.95)' : 'rgba(255,255,255,0.96)',
                  borderColor: 'rgba(197,160,89,0.35)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                }}
              >
                <span
                  className={`text-xs ${safeTheme.text}`}
                  style={{ fontFamily: "'Tajawal', sans-serif" }}
                >
                  <strong className="text-gold">{selectedIds.size}</strong> selected
                </span>
                <div className="flex-1" />
                <BulkButton onClick={handleBulkPin} icon={Pin} label="Pin" />
                {onSharePoem && (
                  <BulkButton
                    onClick={() => {
                      const id = [...selectedIds][0];
                      const sp = savedPoems.find((p) => p.id === id);
                      if (sp) handleShareRow(sp);
                    }}
                    icon={Share2}
                    label="Share"
                    disabled={selectedIds.size !== 1}
                    title={
                      selectedIds.size === 1
                        ? 'Share selected poem'
                        : 'Select exactly one poem to share'
                    }
                  />
                )}
                <BulkButton onClick={handleBulkRemove} icon={Trash2} label="Remove" danger />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </AnimatePresence>
  );
};

// ─── Subcomponents ────────────────────────────────────────────────────────
const SectionLabel = ({ en, ar, icon: Icon, theme }) => (
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
      style={{ background: 'linear-gradient(90deg, rgba(197,160,89,0.3), transparent)' }}
    />
    <span className={`opacity-50 ${theme?.text || ''}`} style={{ fontSize: 10 }} />
  </div>
);

const PinnedCard = ({ sp, darkMode, selectMode, selected, onTap, onUnpin }) => (
  <div className="relative flex-shrink-0">
    <button
      type="button"
      onClick={onTap}
      aria-pressed={selectMode ? selected : undefined}
      className="block w-[168px] p-3 rounded-2xl border text-right"
      dir="rtl"
      style={{
        borderColor: selected ? 'rgba(197,160,89,0.6)' : 'rgba(197,160,89,0.3)',
        background: selected
          ? 'linear-gradient(160deg, rgba(197,160,89,0.22) 0%, rgba(197,160,89,0.06) 100%)'
          : 'linear-gradient(160deg, rgba(197,160,89,0.10) 0%, rgba(197,160,89,0.02) 100%)',
      }}
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
        className="truncate"
        style={{
          fontFamily: "'Reem Kufi', sans-serif",
          fontWeight: 600,
          fontSize: 13,
          color: 'var(--gold)',
          lineHeight: 1.3,
          marginTop: 4,
        }}
      >
        {sp.title || '—'}
      </div>
      <div
        style={{ fontFamily: "'Fustat', sans-serif", fontSize: 11 }}
        className={`mt-0.5 truncate ${darkMode ? 'text-[#D4D0C8] opacity-80' : 'text-[#6B5C3E]'}`}
      >
        {sp.poet || ''}
      </div>
    </button>
    {!selectMode && (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUnpin();
        }}
        aria-label={`Unpin ${sp.title || 'poem'}`}
        title="Unpin"
        className="absolute top-1.5 left-1.5 w-7 h-7 flex items-center justify-center rounded-full transition-opacity"
        style={{
          background: darkMode ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.92)',
          border: '1px solid rgba(197,160,89,0.45)',
          color: 'var(--gold)',
        }}
      >
        <PinOff size={12} />
      </button>
    )}
  </div>
);

const Row = ({
  sp,
  darkMode,
  theme,
  pinned,
  swiped,
  selectMode,
  selected,
  canShare,
  onTap,
  onPin,
  onShare,
  onRemove,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const excerpt = firstLine(sp.poem_text || '');
  return (
    <div className="relative overflow-hidden">
      {/* Trailing swipe actions (touch-only reveal) */}
      <div className="absolute top-0 right-0 bottom-0 w-32 grid grid-cols-2 text-white pointer-events-none">
        <button
          type="button"
          onClick={onPin}
          aria-label={pinned ? 'Unpin poem' : 'Pin poem'}
          className="flex flex-col items-center justify-center gap-1 bg-lapis pointer-events-auto"
          style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 10, fontWeight: 600 }}
        >
          {pinned ? <PinOff size={16} /> : <Pin size={16} />}
          {pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove poem"
          className="flex flex-col items-center justify-center gap-1 bg-red-500 pointer-events-auto"
          style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 10, fontWeight: 600 }}
        >
          <Trash2 size={16} />
          Remove
        </button>
      </div>

      <motion.div
        animate={{ x: swiped ? -128 : 0 }}
        transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
        className={`relative border-b ${darkMode ? 'border-white/[0.04]' : 'border-black/[0.05]'}`}
        style={{
          // Fully opaque so the lapis/red action buttons behind don't bleed through.
          background: darkMode ? '#14131A' : '#FDFCF8',
        }}
      >
        <button
          type="button"
          onClick={onTap}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-pressed={selectMode ? selected : undefined}
          className="relative w-full px-5 py-3 flex items-stretch gap-2.5 text-right group"
          style={{ touchAction: 'pan-y' }}
          dir="rtl"
        >
          {selectMode && (
            <span
              aria-hidden
              className="flex-shrink-0 self-center w-5 h-5 rounded-md flex items-center justify-center border"
              style={{
                borderColor: selected ? 'var(--gold)' : 'rgba(197,160,89,0.45)',
                background: selected ? 'var(--gold)' : 'transparent',
                color: '#0c0c0e',
              }}
            >
              {selected && <Check size={12} strokeWidth={3} />}
            </span>
          )}
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
        </button>

        {/* Per-row inline actions (always visible on pointer-hover devices) */}
        {!selectMode && (
          <div
            className="absolute top-1/2 -translate-y-1/2 left-3 hidden sm:flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
            style={{ pointerEvents: 'auto' }}
          >
            <RowIconButton
              onClick={onPin}
              aria-label={pinned ? 'Unpin poem' : 'Pin poem'}
              icon={pinned ? PinOff : Pin}
              active={pinned}
            />
            {canShare && <RowIconButton onClick={onShare} aria-label="Share poem" icon={Share2} />}
            <RowIconButton onClick={onRemove} aria-label="Remove poem" icon={Trash2} danger />
          </div>
        )}
      </motion.div>
    </div>
  );
};

const RowIconButton = ({ onClick, icon: Icon, active, danger, ...props }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick?.(e);
    }}
    className="w-8 h-8 flex items-center justify-center rounded-full border transition-colors"
    style={{
      background: active ? 'rgba(197,160,89,0.18)' : 'rgba(0,0,0,0.35)',
      borderColor: danger
        ? 'rgba(239,68,68,0.45)'
        : active
          ? 'rgba(197,160,89,0.55)'
          : 'rgba(255,255,255,0.10)',
      color: danger ? 'rgb(248,113,113)' : active ? 'var(--gold)' : 'rgba(255,255,255,0.85)',
    }}
    {...props}
  >
    <Icon size={13} />
  </button>
);

const BulkButton = ({ onClick, icon: Icon, label, danger, disabled, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="px-3 h-9 flex items-center gap-1.5 rounded-xl text-xs font-medium transition-colors disabled:cursor-not-allowed"
    style={{
      background: danger ? 'rgba(239,68,68,0.14)' : 'rgba(197,160,89,0.14)',
      color: danger ? 'rgb(248,113,113)' : 'var(--gold)',
      fontFamily: "'Tajawal', sans-serif",
      border: `1px solid ${danger ? 'rgba(239,68,68,0.35)' : 'rgba(197,160,89,0.35)'}`,
      opacity: disabled ? 0.4 : 1,
    }}
  >
    <Icon size={13} />
    {label}
  </button>
);

const EmptyState = ({ theme }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-6">
    <Heart size={44} className={`${theme.text} opacity-20`} />
    <div>
      <p
        dir="rtl"
        className={`${theme.text} opacity-60`}
        style={{ fontFamily: "'Amiri', serif", fontSize: '1.05rem' }}
      >
        لا توجد قصائد محفوظة
      </p>
      <p
        className={`${theme.text} opacity-40 mt-1`}
        style={{ fontFamily: "'Bodoni Moda', serif", fontStyle: 'italic', fontSize: 12 }}
      >
        Save a poem and it will rest here.
      </p>
    </div>
  </div>
);

const EmptyResults = ({ theme, query }) => (
  <div className="text-center py-12 px-6">
    <p
      className={`${theme.text} opacity-60`}
      style={{ fontFamily: "'Tajawal', sans-serif", fontSize: 13 }}
    >
      No saved poems match “{query}”.
    </p>
  </div>
);

export default SavedPoemsView;
