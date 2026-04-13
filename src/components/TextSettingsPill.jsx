import { useState, useEffect } from 'react';
import { Popover, ToggleGroup, Select } from 'radix-ui';
import { Languages, ALargeSmall, ChevronDown, Check, ExternalLink, Sparkles } from 'lucide-react';
import { THEME } from '../constants/theme.js';
import { FONTS } from '../constants/fonts.js';
import { useUIStore } from '../stores/uiStore';

// URL of the geometric-explorer pattern generator (open locally from project root)
const GENERATOR_URL = '/design-review/islamic-patterns/generate.html';

// Patterns saved as favorites in the geometric-explorer
const GENERATOR_FAVORITES = [
  '12.18',
  '3.12^2',
  '4.7 Star',
  'Recursive Lock',
  'Seville Alcazar 12.8.6',
  '6 Losange',
  'Angel',
  '8.12',
  '8.5',
  '9.6 Losange 2',
  'Penrose Monster',
  'alhambra 16 in pieces',
  'Square 12.4.3',
  'Penrose',
];

const TEXT_SIZES = [
  { label: 'S', multiplier: 0.85 },
  { label: 'M', multiplier: 1.0 },
  { label: 'L', multiplier: 1.15 },
  { label: 'XL', multiplier: 1.3 },
];

// Preset opacity values (shown as buttons instead of a slider)
const OPACITY_PRESETS = [
  { label: '30%', value: 0.3 },
  { label: '40%', value: 0.4 },
  { label: '65%', value: 0.65 },
  { label: '155%', value: 1.55 },
];

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ gold, children }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <span
        className="text-xs uppercase tracking-widest opacity-50 font-medium"
        style={{ color: gold }}
      >
        {children}
      </span>
      <div className="flex-1 h-px opacity-10" style={{ background: gold }} />
    </div>
  );
}

// ── Toggle row (small pill) ───────────────────────────────────────────────────
function ToggleRow({ gold, active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
        active ? 'bg-gold/20 border border-gold/40' : 'opacity-40 border border-transparent'
      }`}
      style={{ color: gold }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

// ── Small control slider ──────────────────────────────────────────────────────
function ControlSlider({ gold, label, value, min, max, step, display, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs opacity-50 w-16 flex-shrink-0" style={{ color: gold }}>
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
        style={{ accentColor: gold }}
      />
      <span className="text-xs opacity-70 font-mono w-10 text-right" style={{ color: gold }}>
        {display ?? value}
      </span>
    </div>
  );
}

const TextSettingsPill = () => {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const gold = theme.gold;

  // Text settings
  const showTranslation = useUIStore((s) => s.showTranslation);
  const showTransliteration = useUIStore((s) => s.showTransliteration);
  const textSizeLevel = useUIStore((s) => s.textSize);
  const currentFont = useUIStore((s) => s.font);

  // Background settings
  const bgOpacity = useUIStore((s) => s.bgOpacity);
  const bgColor = useUIStore((s) => s.bgColor);
  const bgParallax = useUIStore((s) => s.bgParallax);
  const bgPattern = useUIStore((s) => s.bgPattern);
  const defaultColor = darkMode ? '#4a7cc9' : '#2e5090';
  const [hexInput, setHexInput] = useState(bgColor || defaultColor);
  useEffect(() => {
    setHexInput(bgColor || defaultColor);
  }, [bgColor, defaultColor]);

  // Sparkle settings
  const sparkleEnabled = useUIStore((s) => s.sparkleEnabled);
  const sparkleColor = useUIStore((s) => s.sparkleColor);
  const [sparkleHexInput, setSparkleHexInput] = useState(sparkleColor || '#c5a059');
  useEffect(() => {
    setSparkleHexInput(sparkleColor || '#c5a059');
  }, [sparkleColor]);

  const highlightStyle = useUIStore((s) => s.highlightStyle);

  const HIGHLIGHT_STYLES = [
    { value: 'none',        label: 'Off' },
    { value: 'glow',        label: 'Glow' },
    { value: 'underline',   label: 'Line' },
    { value: 'pill',        label: 'Pill' },
    { value: 'focus-blur',  label: 'Blur' },
  ];

  const getStore = useUIStore.getState;

  const panelBg = darkMode ? 'bg-stone-950/95' : 'bg-white/95';
  const inputBg = darkMode ? 'bg-black/40' : 'bg-white/60';

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
            aria-label="Text and background settings"
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
            className={`rounded-2xl p-4 w-72 backdrop-blur-xl border ${theme.border} ${panelBg} overflow-y-auto`}
            style={{ zIndex: 46, maxHeight: '90vh' }}
          >
            {/* ── Text section ───────────────────────────────────────── */}
            {/* Row 1: Translation Toggle */}
            <button
              onClick={() => getStore().toggleTranslation()}
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
              onClick={() => getStore().toggleTransliteration()}
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
                  if (v) getStore().setTextSize(Number(v));
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
              <Select.Root value={currentFont} onValueChange={(v) => getStore().setFont(v)}>
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

            {/* Row 5: Highlight Style */}
            <div className="mt-3">
              <span
                className="text-xs uppercase tracking-wider opacity-60 mb-1.5 block"
                style={{ color: gold }}
              >
                Highlight
              </span>
              <ToggleGroup.Root
                type="single"
                value={highlightStyle}
                onValueChange={(v) => {
                  if (v) {
                    useUIStore.getState().setHighlightStyle(v);
                    useUIStore.getState().addLog('UI', `Highlight style: ${v}`, 'user');
                  }
                }}
                className="flex gap-1 flex-wrap"
              >
                {HIGHLIGHT_STYLES.map((s) => (
                  <ToggleGroup.Item
                    key={s.value}
                    value={s.value}
                    data-highlight-style={s.value === 'none' ? 'off' : s.value}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                      highlightStyle === s.value
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

            {/* ── Background section ──────────────────────────────────── */}
            <SectionLabel gold={gold}>Background</SectionLabel>

            {/* Pattern dropdown */}
            <div className="mb-3">
              <span className="text-xs opacity-50 mb-1.5 block" style={{ color: gold }}>
                Pattern
              </span>
              <Select.Root value={bgPattern} onValueChange={(v) => getStore().setBgPattern(v)}>
                <Select.Trigger
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 border ${theme.border} ${inputBg} transition-all duration-200`}
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

            {/* Opacity presets */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs opacity-50" style={{ color: gold }}>
                  Opacity
                </span>
                <span className="text-xs opacity-60 font-mono" style={{ color: gold }}>
                  {Math.round(bgOpacity * 100)}%
                </span>
              </div>
              <div className="flex gap-1.5">
                {OPACITY_PRESETS.map(({ label, value }) => (
                  <button
                    key={label}
                    onClick={() => getStore().setBgOpacity(value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
                      Math.abs(bgOpacity - value) < 0.01
                        ? 'bg-gold/20 border-gold/40'
                        : 'opacity-50 hover:opacity-80 border-transparent'
                    }`}
                    style={{ color: gold }}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
                  onChange={(e) => getStore().setBgColor(e.target.value)}
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
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) getStore().setBgColor(v);
                  }}
                  className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-mono border ${theme.border} min-w-0 ${inputBg}`}
                  style={{ color: gold }}
                  maxLength={7}
                  placeholder={defaultColor}
                  spellCheck={false}
                />
                {bgColor && (
                  <button
                    onClick={() => {
                      getStore().setBgColor('');
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

            {/* Parallax speed slider */}
            <div className="mb-2">
              <ControlSlider
                gold={gold}
                label="Parallax"
                value={Math.round(bgParallax * 100)}
                min={0}
                max={20}
                step={1}
                display={`${Math.round(bgParallax * 100)}%`}
                onChange={(v) => getStore().setBgParallax(v / 100)}
              />
            </div>

            {/* Generator link */}
            <a
              href={GENERATOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs opacity-40 hover:opacity-70 transition-opacity mt-1"
              style={{ color: gold }}
            >
              <ExternalLink size={11} />
              Open pattern generator
            </a>

            {/* ── Sparkles section ────────────────────────────────────── */}
            <SectionLabel gold={gold}>Sparkles</SectionLabel>

            <div className="space-y-1 mb-3">
              <ToggleRow
                gold={gold}
                active={sparkleEnabled}
                onClick={() => getStore().setSparkleEnabled(!sparkleEnabled)}
                icon={<Sparkles size={14} style={{ color: gold }} />}
              >
                Gold sparkles
              </ToggleRow>
            </div>

            {/* Sparkle colour picker */}
            <div className="mb-3">
              <span className="text-xs opacity-50 mb-1.5 block" style={{ color: gold }}>
                Sparkle colour
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={sparkleColor || '#c5a059'}
                  onChange={(e) => getStore().setSparkleColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0.5 flex-shrink-0"
                  style={{ background: 'transparent' }}
                  title="Pick sparkle colour"
                />
                <input
                  type="text"
                  value={sparkleHexInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSparkleHexInput(v);
                    if (/^#[0-9A-Fa-f]{6}$/.test(v)) getStore().setSparkleColor(v);
                  }}
                  className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-mono border ${theme.border} min-w-0 ${inputBg}`}
                  style={{ color: gold }}
                  maxLength={7}
                  placeholder="#c5a059"
                  spellCheck={false}
                />
                {sparkleColor && sparkleColor !== '#c5a059' && (
                  <button
                    onClick={() => {
                      getStore().setSparkleColor('#c5a059');
                      setSparkleHexInput('#c5a059');
                    }}
                    className="text-sm opacity-40 hover:opacity-80 transition-opacity flex-shrink-0"
                    style={{ color: gold }}
                    title="Reset to gold"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
};

export default TextSettingsPill;
