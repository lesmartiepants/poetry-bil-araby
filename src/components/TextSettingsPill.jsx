import { useState, useEffect } from 'react';
import { Popover, ToggleGroup, Select } from 'radix-ui';
import { Languages, ALargeSmall, ChevronDown, Check, ExternalLink } from 'lucide-react';
import { THEME } from '../constants/theme.js';
import { FONTS } from '../constants/fonts.js';
import { useUIStore } from '../stores/uiStore';

// URL of the geometric-explorer pattern generator (open locally from project root)
const GENERATOR_URL = '/design-review/islamic-patterns/generate.html';

// Patterns saved as favorites in design-review/islamic-patterns/favourites.json
const GENERATOR_FAVORITES = [
  'Squoctogon',
  '3-8-12',
  'Girih Inflation 10',
  'Seville Alcazar 12.8.6',
  '6 Losange',
  'Angel',
  '18.9',
  '18',
  '24.12',
  '8 Ring',
  '8 and 8',
  '8.12',
  '8.5',
  '9.6 Losange 2',
  'Great Mosque of Malatya',
  "Mughal I'timad",
  'Penrose Monster',
  'Tricorn',
  'alhambra16',
  'alhambra 16 in pieces',
  'Two Monsters',
  'Square 12.4.3',
  'Penrose',
  'Girih Star',
  '12.18',
  '16.8',
  '3.12^2',
  '4.5',
  '4.7 Star',
  'Chikipoo',
  'Mamluk Quran',
  'Recursive Lock',
  'square_12',
  'Girih Inflation 10.v1',
  'Girih Inflation 10.v2',
  'Girih Inflation 10.v3',
];

const TEXT_SIZES = [
  { label: 'S', multiplier: 0.85 },
  { label: 'M', multiplier: 1.0 },
  { label: 'L', multiplier: 1.15 },
  { label: 'XL', multiplier: 1.3 },
];

const TextSettingsPill = () => {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const gold = theme.gold;
  const showTranslation = useUIStore((s) => s.showTranslation);
  const showTransliteration = useUIStore((s) => s.showTransliteration);
  const textSizeLevel = useUIStore((s) => s.textSize);
  const currentFont = useUIStore((s) => s.font);
  const bgOpacity = useUIStore((s) => s.bgOpacity);
  const bgColor = useUIStore((s) => s.bgColor);
  const bgParallax = useUIStore((s) => s.bgParallax);
  const bgPattern = useUIStore((s) => s.bgPattern);
  const defaultColor = darkMode ? '#4a7cc9' : '#2e5090';
  // Local state for the hex text input (allows partial edits)
  const [hexInput, setHexInput] = useState(bgColor || defaultColor);
  useEffect(() => {
    setHexInput(bgColor || defaultColor);
  }, [bgColor, defaultColor]);
  return (
    <>
      <style>{`
        @keyframes pillSlideDown {
          from { opacity: 0; transform: translateY(-0.5rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pillSlideUp {
          from { opacity: 0; transform: translateY(0.5rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pillSlideLeft {
          from { opacity: 0; transform: translateX(0.5rem); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pillSlideRight {
          from { opacity: 0; transform: translateX(-0.5rem); }
          to { opacity: 1; transform: translateX(0); }
        }
        [data-side="bottom"] { animation: pillSlideDown 0.15s ease-out; }
        [data-side="top"] { animation: pillSlideUp 0.15s ease-out; }
        [data-side="left"] { animation: pillSlideLeft 0.15s ease-out; }
        [data-side="right"] { animation: pillSlideRight 0.15s ease-out; }
      `}</style>

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            aria-label="Text settings"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 backdrop-blur-xl border ${theme.border} ${
              darkMode ? 'bg-black/70' : 'bg-white/80'
            } ${theme.goldHoverBg15}`}
          >
            <ALargeSmall size={18} style={{ color: gold }} />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="left"
            align="start"
            sideOffset={8}
            className={`rounded-2xl p-4 min-w-[16rem] backdrop-blur-xl border ${theme.border} ${
              darkMode ? 'bg-stone-950/95' : 'bg-white/95'
            }`}
            style={{ zIndex: 46 }}
          >
            {/* Row 1: Translation Toggle */}
            <button
              onClick={() => useUIStore.getState().toggleTranslation()}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                showTranslation
                  ? 'bg-gold/20 border border-gold/40'
                  : 'opacity-40 border border-transparent'
              }`}
              style={{ color: gold }}
            >
              <Languages size={14} style={{ color: gold }} />
              <span>Translation</span>
            </button>

            {/* Row 2: Romanize Toggle */}
            <button
              onClick={() => useUIStore.getState().toggleTransliteration()}
              className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 mt-1 ${
                showTransliteration
                  ? 'bg-gold/20 border border-gold/40'
                  : 'opacity-40 border border-transparent'
              }`}
              style={{ color: gold }}
            >
              <ALargeSmall size={14} style={{ color: gold }} />
              <span>Romanize</span>
            </button>

            {/* Row 3: Text Size */}
            <div className="mt-3">
              <span
                className="text-xs uppercase tracking-wider opacity-60 mb-1.5 block"
                style={{ color: gold }}
              >
                Text Size
              </span>
              <ToggleGroup.Root
                type="single"
                value={String(textSizeLevel)}
                onValueChange={(v) => {
                  if (v) useUIStore.getState().setTextSize(Number(v));
                }}
                className="flex gap-1"
              >
                {TEXT_SIZES.map((s, i) => (
                  <ToggleGroup.Item
                    key={i}
                    value={String(i)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                      textSizeLevel === i
                        ? 'bg-gold/20 border-gold/40'
                        : 'opacity-50 hover:opacity-80 border-transparent'
                    }`}
                    style={{ color: gold }}
                  >
                    {s.label}
                  </ToggleGroup.Item>
                ))}
              </ToggleGroup.Root>
            </div>

            {/* Row 4: Font */}
            <div className="mt-3">
              <span
                className="text-xs uppercase tracking-wider opacity-60 mb-1.5 block"
                style={{ color: gold }}
              >
                Font
              </span>
              <Select.Root
                value={currentFont}
                onValueChange={(v) => useUIStore.getState().setFont(v)}
              >
                <Select.Trigger
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border ${theme.border} backdrop-blur-xl transition-all duration-200 ${
                    darkMode ? 'bg-black/50' : 'bg-white/50'
                  }`}
                  style={{ color: gold }}
                  aria-label="Select font"
                >
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown size={14} style={{ color: gold, opacity: 0.6 }} />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content
                    className={`rounded-xl p-1 backdrop-blur-xl border ${theme.border} ${
                      darkMode ? 'bg-stone-950/95' : 'bg-white/95'
                    }`}
                    style={{ zIndex: 100 }}
                    position="popper"
                    sideOffset={4}
                  >
                    <Select.Viewport>
                      {FONTS.map((f) => (
                        <Select.Item
                          key={f.id}
                          value={f.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150 ${
                            darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'
                          }`}
                          style={{ color: gold }}
                        >
                          <Select.ItemText>
                            <span className={f.family} style={{ fontSize: '1rem' }}>
                              {f.labelAr}
                            </span>
                          </Select.ItemText>
                          <Select.ItemIndicator>
                            <Check size={14} style={{ color: gold }} />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>

            {/* ── Background Settings ──────────────────────────────────── */}
            <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${gold}22` }}>
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs uppercase tracking-wider opacity-60"
                  style={{ color: gold }}
                >
                  Background
                </span>
                <a
                  href={GENERATOR_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs opacity-40 hover:opacity-70 transition-opacity"
                  style={{ color: gold }}
                  title="Open geometric-explorer pattern generator"
                >
                  <ExternalLink size={10} />
                  Generator
                </a>
              </div>

              {/* Opacity slider */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs opacity-50" style={{ color: gold }}>
                    Opacity
                  </span>
                  <span className="text-xs opacity-70 font-mono" style={{ color: gold }}>
                    {Math.round(bgOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  value={Math.round(bgOpacity * 100)}
                  onChange={(e) => useUIStore.getState().setBgOpacity(Number(e.target.value) / 100)}
                  className="w-full"
                  style={{ accentColor: gold }}
                />
              </div>

              {/* Colour picker */}
              <div className="mb-3">
                <span className="text-xs opacity-50 mb-1.5 block" style={{ color: gold }}>
                  Line colour
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor || defaultColor}
                    onChange={(e) => {
                      useUIStore.getState().setBgColor(e.target.value);
                    }}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0.5 flex-shrink-0"
                    style={{ background: 'transparent' }}
                    title="Pick line colour"
                  />
                  <input
                    type="text"
                    value={hexInput}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHexInput(v);
                      if (/^#[0-9A-Fa-f]{6}$/.test(v)) {
                        useUIStore.getState().setBgColor(v);
                      }
                    }}
                    className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-mono border ${theme.border} min-w-0 ${
                      darkMode ? 'bg-black/50' : 'bg-white/50'
                    }`}
                    style={{ color: gold }}
                    maxLength={7}
                    placeholder={defaultColor}
                    spellCheck={false}
                  />
                  {bgColor && (
                    <button
                      onClick={() => {
                        useUIStore.getState().setBgColor('');
                        setHexInput(defaultColor);
                      }}
                      className="text-sm opacity-40 hover:opacity-80 transition-opacity flex-shrink-0"
                      style={{ color: gold }}
                      title="Reset to theme colour"
                    >
                      ↺
                    </button>
                  )}
                </div>
              </div>

              {/* Pattern dropdown */}
              <div className="mb-3">
                <span className="text-xs opacity-50 mb-1.5 block" style={{ color: gold }}>
                  Pattern
                </span>
                <Select.Root
                  value={bgPattern}
                  onValueChange={(v) => useUIStore.getState().setBgPattern(v)}
                >
                  <Select.Trigger
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border ${theme.border} backdrop-blur-xl transition-all duration-200 ${
                      darkMode ? 'bg-black/50' : 'bg-white/50'
                    }`}
                    style={{ color: gold }}
                    aria-label="Select background pattern"
                  >
                    <Select.Value />
                    <Select.Icon>
                      <ChevronDown size={14} style={{ color: gold, opacity: 0.6 }} />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content
                      className={`rounded-xl p-1 backdrop-blur-xl border ${theme.border} ${
                        darkMode ? 'bg-stone-950/95' : 'bg-white/95'
                      }`}
                      style={{ zIndex: 100, maxHeight: '14rem', overflowY: 'auto' }}
                      position="popper"
                      sideOffset={4}
                    >
                      <Select.Viewport>
                        {GENERATOR_FAVORITES.map((name) => (
                          <Select.Item
                            key={name}
                            value={name}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150 text-xs ${
                              darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'
                            }`}
                            style={{ color: gold }}
                          >
                            <Select.ItemText>{name}</Select.ItemText>
                            <Select.ItemIndicator>
                              <Check size={12} style={{ color: gold }} />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Parallax speed slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs opacity-50" style={{ color: gold }}>
                    Parallax
                  </span>
                  <span className="text-xs opacity-70 font-mono" style={{ color: gold }}>
                    {Math.round(bgParallax * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={Math.round(bgParallax * 100)}
                  onChange={(e) =>
                    useUIStore.getState().setBgParallax(Number(e.target.value) / 100)
                  }
                  className="w-full"
                  style={{ accentColor: gold }}
                />
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
};

export default TextSettingsPill;
