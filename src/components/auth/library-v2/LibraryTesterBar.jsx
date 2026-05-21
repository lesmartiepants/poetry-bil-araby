import { Library, FlaskConical } from 'lucide-react';
import { LIBRARY_VARIANTS, useLibraryVariant } from './LibraryHost.jsx';

/**
 * LibraryTesterBar — TEMPORARY pill at the top of the screen that lets the
 * user / reviewers swap between the original Saved Poems view and the three
 * library-v2 variants without leaving the app.  Designed to be slim, glassy,
 * and unobtrusive (and clearly labeled "TEST" so it's obvious this is dev UI).
 *
 * Tap a variant chip and then open Saved Poems via the normal account menu —
 * the chosen variant will render.  The "Open" button is provided as a
 * shortcut.  The "Demo" toggle injects 8 sample saved poems so the variants
 * can be evaluated when the user has nothing saved yet.
 */
const LibraryTesterBar = ({ darkMode = true, onOpenLibrary }) => {
  const { variant, demo, setVariant, setDemo } = useLibraryVariant();

  return (
    <div
      className="fixed top-0 left-1/2 -translate-x-1/2 z-[110]"
      style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}
    >
      <div
        role="region"
        aria-label="Library v2 tester"
        className={`mt-1 flex items-center gap-1.5 px-2 py-1.5 rounded-full border ${darkMode ? 'border-white/10' : 'border-black/10'} backdrop-blur-2xl backdrop-saturate-150 shadow-lg`}
        style={{
          background: darkMode ? 'rgba(12,12,14,0.78)' : 'rgba(253,252,248,0.78)',
          fontFamily: "'Tajawal', sans-serif",
        }}
      >
        <span
          className="inline-flex items-center gap-1 pl-2 pr-2 text-[9.5px] tracking-[0.24em] uppercase text-gold"
          style={{ fontFamily: "'Forum', serif" }}
          title="Temporary tester — remove before final ship"
        >
          <FlaskConical size={10} />
          Lib · Test
        </span>
        <span className="w-px h-4 bg-gold/20" />
        {LIBRARY_VARIANTS.map((v) => {
          const active = variant === v.id;
          return (
            <button
              key={v.id}
              onClick={() => setVariant(v.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] leading-none transition-colors ${
                active
                  ? 'bg-gold/15 text-gold border border-gold/40'
                  : `${darkMode ? 'text-stone-300 hover:text-white' : 'text-stone-700 hover:text-black'} border border-transparent`
              }`}
              title={v.sublabel}
            >
              {v.label}
            </button>
          );
        })}
        <span className="w-px h-4 bg-gold/20" />
        <label
          className={`flex items-center gap-1 pl-1 pr-1.5 text-[10px] cursor-pointer select-none ${darkMode ? 'text-stone-400 hover:text-stone-200' : 'text-stone-600 hover:text-stone-900'}`}
          title="Use 8 sample saved poems for visual testing (only when you have none saved)"
        >
          <input
            type="checkbox"
            checked={demo}
            onChange={(e) => setDemo(e.target.checked)}
            className="w-3 h-3 accent-[#C5A059]"
          />
          Demo
        </label>
        <span className="w-px h-4 bg-gold/20" />
        <button
          onClick={onOpenLibrary}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-lapis/15 border border-lapis-light/40 text-lapis-light hover:bg-lapis/25"
        >
          <Library size={10} />
          Open
        </button>
      </div>
    </div>
  );
};

export default LibraryTesterBar;
