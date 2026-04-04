import { useState, useEffect } from 'react';
import { Drawer } from 'vaul';
import { ToggleGroup, Select } from 'radix-ui';
import {
  Languages,
  ALargeSmall,
  ChevronDown,
  Check,
  ExternalLink,
  X,
  Sparkles,
  Sun,
  Zap,
  Wand2,
} from 'lucide-react';
import { THEME } from '../constants/theme.js';
import { FONTS } from '../constants/fonts.js';
import { useUIStore } from '../stores/uiStore';

// URL of the geometric-explorer pattern generator (open locally from project root)
const GENERATOR_URL = '/design-review/islamic-patterns/generate.html';

// Patterns saved as favorites in the geometric-explorer
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
  const [open, setOpen] = useState(false);
  // Track active snap point to position the custom backdrop correctly
  const [activeSnap, setActiveSnap] = useState(0.22);
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
  const sparkleMode = useUIStore((s) => s.sparkleMode);
  const sparkleGlow = useUIStore((s) => s.sparkleGlow);
  const sparkleBrightness = useUIStore((s) => s.sparkleBrightness);
  const sparkleSpeed = useUIStore((s) => s.sparkleSpeed);
  const sparkleAmount = useUIStore((s) => s.sparkleAmount);

  const getStore = useUIStore.getState;

  const panelBg = darkMode ? 'bg-stone-950/97' : 'bg-white/97';
  const inputBg = darkMode ? 'bg-black/40' : 'bg-white/60';

  const handleClose = () => {
    setOpen(false);
    setActiveSnap(0.22);
  };

  return (
    <>
      {/* Custom backdrop: dims area above the drawer and closes on tap.
          Uses modal={false} on Drawer.Root so poem remains scrollable beneath. */}
      {open && (
        <div
          className="fixed inset-x-0 top-0 bg-black/25 z-40"
          style={{ height: `${(1 - activeSnap) * 100}vh` }}
          onClick={handleClose}
        />
      )}

      <Drawer.Root
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) handleClose();
          else setOpen(true);
        }}
        snapPoints={[0.22, 0.45, 0.92]}
        activeSnapPoint={activeSnap}
        setActiveSnapPoint={(snap) => {
          // null means user dragged below lowest snap — close the drawer
          if (snap === null) handleClose();
          else setActiveSnap(snap);
        }}
        modal={false}
      >
        <Drawer.Trigger asChild>
          <button
            aria-label="Text and background settings"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 backdrop-blur-xl border ${theme.border} ${
              darkMode ? 'bg-black/70' : 'bg-white/80'
            } ${theme.goldHoverBg15}`}
            style={{ position: 'relative', zIndex: 50 }}
          >
            <ALargeSmall size={18} style={{ color: gold }} />
          </button>
        </Drawer.Trigger>

        <Drawer.Portal>
          {/* No Drawer.Overlay — custom backdrop above handles dim + click-to-close */}
          <Drawer.Content
            className={`fixed bottom-0 left-0 right-0 ${panelBg} backdrop-blur-2xl border-t ${theme.border} rounded-t-3xl z-50 flex flex-col`}
            style={{ height: '92vh' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <Drawer.Handle
                className="w-12 h-1.5 rounded-full opacity-30"
                style={{ background: gold }}
              />
            </div>

            {/* Header row */}
            <div className="flex items-center justify-between px-5 pb-2">
              <Drawer.Title className="text-sm font-semibold opacity-60" style={{ color: gold }}>
                Display
              </Drawer.Title>
              <button
                aria-label="Close settings"
                onClick={() => handleClose()}
                className="w-7 h-7 flex items-center justify-center rounded-full opacity-40 hover:opacity-80 transition-opacity"
                style={{ color: gold }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 px-5 pb-8" data-vaul-no-drag>
              {/* ── Text section ───────────────────────────────────────── */}
              <SectionLabel gold={gold}>Text</SectionLabel>

              <div className="space-y-1">
                <ToggleRow
                  gold={gold}
                  active={showTranslation}
                  onClick={() => getStore().toggleTranslation()}
                  icon={<Languages size={14} style={{ color: gold }} />}
                >
                  Translation
                </ToggleRow>

                <ToggleRow
                  gold={gold}
                  active={showTransliteration}
                  onClick={() => getStore().toggleTransliteration()}
                  icon={<ALargeSmall size={14} style={{ color: gold }} />}
                >
                  Romanize
                </ToggleRow>
              </div>

              {/* Text size */}
              <div className="mt-3">
                <span className="text-xs opacity-50 mb-1.5 block" style={{ color: gold }}>
                  Text size
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
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border ${
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

              {/* Font */}
              <div className="mt-3">
                <span className="text-xs opacity-50 mb-1.5 block" style={{ color: gold }}>
                  Font
                </span>
                <Select.Root value={currentFont} onValueChange={(v) => getStore().setFont(v)}>
                  <Select.Trigger
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 border ${theme.border} ${inputBg} transition-all duration-200`}
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
                              <span className={f.family}>{f.labelAr}</span>
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

                <ToggleRow
                  gold={gold}
                  active={sparkleGlow}
                  onClick={() => getStore().setSparkleGlow(!sparkleGlow)}
                  icon={<Sun size={14} style={{ color: gold }} />}
                >
                  Central glow (always on)
                </ToggleRow>
              </div>

              {/* Sparkle mode toggle */}
              <div className="mb-3">
                <span className="text-xs opacity-50 mb-1.5 block" style={{ color: gold }}>
                  Animation style
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => getStore().setSparkleMode('particles')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                      sparkleMode === 'particles'
                        ? 'bg-gold/20 border-gold/40'
                        : 'opacity-50 hover:opacity-80 border-transparent'
                    }`}
                    style={{ color: gold }}
                  >
                    <Sparkles size={11} />
                    Gold
                  </button>
                  <button
                    onClick={() => getStore().setSparkleMode('ray-tracing')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                      sparkleMode === 'ray-tracing'
                        ? 'bg-gold/20 border-gold/40'
                        : 'opacity-50 hover:opacity-80 border-transparent'
                    }`}
                    style={{ color: gold }}
                  >
                    <Wand2 size={11} />
                    L&amp;S Rays
                  </button>
                </div>
              </div>

              {/* Particle controls (hidden in L&S ray-tracing mode) */}
              {sparkleMode === 'particles' && (
                <div className="space-y-2">
                  <ControlSlider
                    gold={gold}
                    label="Brightness"
                    value={Math.round(sparkleBrightness * 100)}
                    min={10}
                    max={200}
                    step={10}
                    display={`${Math.round(sparkleBrightness * 100)}%`}
                    onChange={(v) => getStore().setSparkleBrightness(v / 100)}
                  />
                  <ControlSlider
                    gold={gold}
                    label="Speed"
                    value={Math.round(sparkleSpeed * 100)}
                    min={25}
                    max={300}
                    step={25}
                    display={`${Math.round(sparkleSpeed * 100)}%`}
                    onChange={(v) => getStore().setSparkleSpeed(v / 100)}
                  />
                  <ControlSlider
                    gold={gold}
                    label="Amount"
                    value={sparkleAmount}
                    min={5}
                    max={60}
                    step={5}
                    display={String(sparkleAmount)}
                    onChange={(v) => getStore().setSparkleAmount(v)}
                  />
                </div>
              )}

              <div className="h-6" />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
};

export default TextSettingsPill;
