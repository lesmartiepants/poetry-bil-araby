import { Popover, ToggleGroup, Select } from 'radix-ui';
import { Languages, ALargeSmall, Type, ChevronDown, Check } from 'lucide-react';
import { THEME } from '../constants/theme.js';
import { FONTS } from '../constants/fonts.js';
import { useUIStore } from '../stores/uiStore';

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
  const textSizeLabel = TEXT_SIZES[textSizeLevel]?.label || 'M';

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
        [data-side="bottom"] { animation: pillSlideDown 0.15s ease-out; }
        [data-side="top"] { animation: pillSlideUp 0.15s ease-out; }
      `}</style>

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            aria-label="Text settings"
            className={`rounded-full px-3 py-1.5 backdrop-blur-xl border border-gold/30 text-xs font-brand-en flex items-center gap-1.5 transition-all duration-200 ${
              darkMode ? 'bg-black/70' : 'bg-white/80'
            } ${theme.goldHoverBg15}`}
            style={{ color: gold }}
          >
            <Type size={14} style={{ color: gold }} />
            <span className="opacity-40">·</span>
            <span style={{ opacity: showTransliteration ? 1 : 0.4 }}>عA</span>
            <span className="opacity-40">·</span>
            <span>{textSizeLabel}</span>
            <span className="opacity-40">·</span>
            <span>{currentFont.slice(0, 5)}</span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={8}
            className={`rounded-2xl p-4 min-w-[16rem] backdrop-blur-xl border border-gold/30 ${
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
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 border border-gold/30 backdrop-blur-xl transition-all duration-200 ${
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
                    className={`rounded-xl p-1 backdrop-blur-xl border border-gold/30 ${
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
                              خط عربي
                            </span>
                            <span className="text-xs opacity-60 ml-2">{f.label}</span>
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
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
};

export default TextSettingsPill;
