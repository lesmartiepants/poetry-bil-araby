import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  Heart,
  Trash2,
  Share2,
  Pin,
  Download,
  CheckCircle2,
} from 'lucide-react';
import { formatRelative, firstTwoLines } from './utils.js';

/**
 * Library v2 · Option B — Diwan Grid (ديوان)
 *
 * 2-column tile mosaic on mobile (3-col on tablet, 4-col on desktop) with a
 * sticky glass header and a real multi-select state: tap any tile's check to
 * enter selection mode; the bottom action bar (Export · Share · Pin · Remove)
 * replaces the default footer.  Mirrors iOS Photos / Files multi-select.
 */
const SavedPoemsView_B_DiwanGrid = ({
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
  const [sort, setSort] = useState('recent'); // recent | poet | title
  const [selected, setSelected] = useState(() => new Set());

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (selected.size > 0) setSelected(new Set());
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, selected.size]);

  if (!isOpen) return null;

  const poets = Array.from(new Set(savedPoems.map((p) => p.poet).filter(Boolean)));

  const filtered = savedPoems
    .filter((p) => {
      if (activePoet !== 'all' && p.poet !== activePoet) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      return (
        (p.title || '').toLowerCase().includes(q) ||
        (p.poet || '').toLowerCase().includes(q) ||
        (p.poem_text || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === 'poet') return (a.poet || '').localeCompare(b.poet || '');
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
      return new Date(b.saved_at || 0) - new Date(a.saved_at || 0);
    });

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const inSelection = selected.size > 0;
  const selectedItems = filtered.filter((p) => selected.has(p.id));

  const handleBulkRemove = () => {
    selectedItems.forEach((p) => onUnsavePoem?.(p));
    setSelected(new Set());
  };

  const sceneBg = darkMode
    ? 'radial-gradient(circle at 50% 0%, rgba(74,124,201,0.06) 0%, transparent 45%), #0c0c0e'
    : 'radial-gradient(circle at 50% 0%, rgba(74,124,201,0.05) 0%, transparent 45%), #FDFCF8';

  return (
    <motion.div
      key="diwan-grid"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: sceneBg }}
    >
      {/* Sticky glass header */}
      <header
        className={`sticky top-0 z-10 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 md:px-8 md:pt-6 border-b ${theme.border} backdrop-blur-2xl backdrop-saturate-150`}
        style={{
          background: darkMode ? 'rgba(12,12,14,0.85)' : 'rgba(253,252,248,0.85)',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <ChevronLeft size={20} className={theme.text} />
          </button>
          <div className="flex-1 text-center">
            <div
              dir="rtl"
              style={{
                fontFamily: "'Reem Kufi', sans-serif",
                fontWeight: 700,
                fontSize: '1.15rem',
                color: 'var(--gold)',
                lineHeight: 1,
              }}
            >
              قَصائِدي · {savedPoems.length}
            </div>
            <div
              style={{ fontFamily: "'Forum', serif" }}
              className={`text-[9px] tracking-[0.32em] uppercase ${theme.text} opacity-50 mt-1`}
            >
              My Diwan
            </div>
          </div>
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/5 transition-colors"
            aria-label="Layout"
          >
            <X size={20} className={`${theme.text} opacity-0 pointer-events-none`} />
          </button>
        </div>

        {/* Search + sort */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${theme.border} ${darkMode ? 'bg-white/[0.05]' : 'bg-black/[0.04]'}`}
        >
          <Search size={14} className={`${theme.text} opacity-50`} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by line, title, or poet…"
            className={`flex-1 bg-transparent outline-none text-sm ${theme.text} placeholder:opacity-40`}
            style={{ fontFamily: "'Tajawal', sans-serif" }}
          />
          <button
            onClick={() =>
              setSort((s) => (s === 'recent' ? 'poet' : s === 'poet' ? 'title' : 'recent'))
            }
            className="h-7 px-2.5 rounded-lg border border-gold/25 text-gold text-[11px] inline-flex items-center gap-1"
            style={{
              background: 'rgba(197,160,89,0.10)',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            {sort === 'recent' ? 'Recent' : sort === 'poet' ? 'Poet' : 'Title'}
            <ChevronDown size={10} />
          </button>
        </div>

        {/* Poet chips */}
        {poets.length > 0 && (
          <div className="flex gap-1.5 mt-3 overflow-x-auto custom-scrollbar-hide -mx-1 px-1">
            {[{ id: 'all', label: 'All' }, ...poets.map((p) => ({ id: p, label: p }))].map(
              (chip) => {
                const active = activePoet === chip.id;
                return (
                  <button
                    key={chip.id}
                    onClick={() => setActivePoet(chip.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
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
      </header>

      {/* Selection bar */}
      {inSelection && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-4 py-2.5 border-b"
          style={{
            background: 'rgba(74,124,201,0.14)',
            borderColor: 'rgba(74,124,201,0.3)',
            color: '#6B95D6',
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '13px',
          }}
        >
          <CheckCircle2 size={14} />
          <span className="font-medium">{selected.size} selected</span>
          <span className="flex-1" />
          <button
            onClick={() => setSelected(new Set())}
            className="px-2 py-0.5 rounded-md hover:bg-white/5"
          >
            Done
          </button>
        </motion.div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 md:px-8 pt-3 pb-[max(env(safe-area-inset-bottom),96px)]">
        {filtered.length === 0 ? (
          <EmptyState theme={theme} />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4 max-w-7xl mx-auto">
            {filtered.map((sp, idx) => (
              <Tile
                key={sp.id || idx}
                sp={sp}
                index={idx}
                darkMode={darkMode}
                theme={theme}
                isSelected={selected.has(sp.id)}
                inSelection={inSelection}
                onCheckClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(sp.id);
                }}
                onClick={() => {
                  if (inSelection) toggleSelect(sp.id);
                  else onSelectPoem?.(sp);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom action bar (selection mode) */}
      {inSelection && (
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          className={`fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around px-4 py-3 pb-[max(env(safe-area-inset-bottom),12px)] border-t ${theme.border} backdrop-blur-2xl backdrop-saturate-150`}
          style={{
            background: darkMode ? 'rgba(12,12,14,0.86)' : 'rgba(253,252,248,0.86)',
          }}
        >
          <ActionBtn label="Export" icon={Download} color="text-gold" />
          <ActionBtn label="Share" icon={Share2} color="text-gold" />
          <ActionBtn label="Pin" icon={Pin} color={theme.text} />
          <ActionBtn label="Remove" icon={Trash2} color="text-red-400" onClick={handleBulkRemove} />
        </motion.nav>
      )}
    </motion.div>
  );
};

const ActionBtn = ({ label, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 flex-1 min-h-[48px] py-1 ${color} active:scale-95 transition-transform`}
    style={{ fontFamily: "'Tajawal', sans-serif", fontSize: '11px' }}
  >
    <Icon size={20} />
    {label}
  </button>
);

const Tile = ({ sp, index, darkMode, theme, isSelected, inSelection, onCheckClick, onClick }) => {
  const excerpt = firstTwoLines(sp.poem_text || '');
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.025, 0.3) }}
      onClick={onClick}
      dir="rtl"
      className={`relative text-right p-3 md:p-4 rounded-2xl border min-h-[168px] md:min-h-[200px] flex flex-col overflow-hidden transition-all ${
        isSelected
          ? 'border-lapis-light bg-lapis/10'
          : `${theme.border} ${darkMode ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.01]' : 'bg-gradient-to-br from-white/85 to-white/55'} hover:border-gold/30`
      }`}
    >
      {/* top gold rule */}
      <span
        aria-hidden
        className="absolute top-0 left-0 right-0 h-[2px] opacity-40"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
        }}
      />
      {/* Check (top-left in LTR space) */}
      <span
        onClick={onCheckClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCheckClick(e);
          }
        }}
        className={`absolute top-2.5 left-2.5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
          isSelected
            ? 'bg-lapis border-lapis-light text-white'
            : `${darkMode ? 'bg-black/40' : 'bg-white/70'} border ${theme.border}`
        }`}
        style={{ backdropFilter: 'blur(6px)' }}
        aria-label={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
      {/* Heart (top-right) */}
      <Heart size={14} className="absolute top-2.5 right-2.5 fill-gold text-gold opacity-90" />

      <div
        style={{
          fontFamily: "'Reem Kufi', sans-serif",
          fontWeight: 600,
          fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
          lineHeight: 1.25,
          color: 'var(--gold)',
        }}
        className="mt-7 mb-1 truncate"
      >
        {sp.title || '—'}
      </div>
      <div
        style={{ fontFamily: "'Fustat', sans-serif", fontSize: '11px' }}
        className={`${darkMode ? 'text-[#D4D0C8] opacity-75' : 'text-[#6B5C3E] opacity-90'} mb-2 truncate`}
      >
        {sp.poet || ''}
      </div>
      {excerpt && (
        <p
          style={{
            fontFamily: "'Amiri', serif",
            fontSize: 'clamp(0.75rem, 1.6vw, 0.9rem)',
            lineHeight: 1.7,
          }}
          className={`${theme.text} opacity-70 flex-1 overflow-hidden`}
        >
          {excerpt}
        </p>
      )}
      <div
        className={`mt-2 pt-2 flex items-center justify-between text-[9.5px] ${theme.text} opacity-50 border-t border-dashed`}
        style={{ borderColor: 'rgba(197,160,89,0.18)' }}
      >
        <span style={{ fontFamily: "'Tajawal', sans-serif" }}>
          {sp.saved_at ? formatRelative(sp.saved_at) : ''}
        </span>
        {sp.category && (
          <span
            className="text-gold"
            style={{
              padding: '1.5px 6px',
              borderRadius: 3,
              background: 'rgba(197,160,89,0.10)',
              fontSize: 9,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: "'Tajawal', sans-serif",
            }}
          >
            {sp.category}
          </span>
        )}
      </div>
    </motion.button>
  );
};

const EmptyState = ({ theme }) => (
  <div className="text-center py-20">
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
      Build your diwan one poem at a time.
    </p>
  </div>
);

export default SavedPoemsView_B_DiwanGrid;
