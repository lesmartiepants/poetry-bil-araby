import { useState, useRef, useEffect } from 'react';
import { Languages } from 'lucide-react';
import { FONTS } from '../constants/fonts.js';
import { useUIStore } from '../stores/uiStore';

const TEXT_SIZES = [
  { label: 'S', multiplier: 0.85 },
  { label: 'M', multiplier: 1.0 },
  { label: 'L', multiplier: 1.15 },
  { label: 'XL', multiplier: 1.3 },
];

const GOLD = 'var(--gold)';
const GOLD_RGB = '197,160,89';

const TextSettingsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);

  const darkMode = useUIStore((s) => s.darkMode);
  const showTranslation = useUIStore((s) => s.showTranslation);
  const showTransliteration = useUIStore((s) => s.showTransliteration);
  const textSizeLevel = useUIStore((s) => s.textSize);
  const currentFont = useUIStore((s) => s.font);

  const currentSizeData = TEXT_SIZES[textSizeLevel];
  const hasActiveToggles = showTranslation || showTransliteration;

  const glassBg = darkMode ? 'rgba(12,12,14,0.9)' : 'rgba(253,252,248,0.95)';
  const textColor = darkMode ? 'rgba(255,255,255,0.82)' : 'rgba(30,24,18,0.82)';
  const mutedColor = darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(30,24,18,0.35)';
  const dividerColor = darkMode ? 'rgba(197,160,89,0.1)' : 'rgba(197,160,89,0.15)';
  const cardBorderColor = isOpen
    ? `rgba(${GOLD_RGB},0.45)`
    : `rgba(${GOLD_RGB},0.2)`;

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [isOpen]);

  const decreaseSize = () =>
    useUIStore.getState().setTextSize(Math.max(textSizeLevel - 1, 0));
  const increaseSize = () =>
    useUIStore.getState().setTextSize(Math.min(textSizeLevel + 1, TEXT_SIZES.length - 1));

  return (
    <>
      <style>{`
        @keyframes textPanelIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        .tsp-size-dot {
          height: 6px;
          border-radius: 3px;
          background: rgba(${GOLD_RGB}, 0.22);
          border: none;
          cursor: pointer;
          padding: 0;
          transition: width 0.25s cubic-bezier(0.34,1.56,0.64,1),
                      background 0.2s;
        }
        .tsp-size-dot.active {
          background: ${GOLD};
        }
        .tsp-font-btn {
          padding: 9px 4px 7px;
          border-radius: 10px;
          border: 1.5px solid rgba(${GOLD_RGB}, 0.12);
          background: rgba(${GOLD_RGB}, 0.04);
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
        }
        .tsp-font-btn:hover {
          border-color: rgba(${GOLD_RGB}, 0.3);
          background: rgba(${GOLD_RGB}, 0.08);
          transform: translateY(-1px);
        }
        .tsp-font-btn.active {
          border-color: rgba(${GOLD_RGB}, 0.55);
          background: rgba(${GOLD_RGB}, 0.12);
        }
        .tsp-toggle-btn {
          flex: 1;
          padding: 10px 6px;
          border-radius: 11px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: border-color 0.2s, background 0.2s;
        }
        .tsp-toggle-btn:hover {
          filter: brightness(1.1);
        }
        .tsp-size-btn {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          border: 1px solid rgba(${GOLD_RGB}, 0.22);
          background: rgba(${GOLD_RGB}, 0.07);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s;
        }
        .tsp-size-btn:hover:not(:disabled) {
          background: rgba(${GOLD_RGB}, 0.14);
          border-color: rgba(${GOLD_RGB}, 0.35);
        }
        .tsp-size-btn:disabled {
          opacity: 0.3;
          cursor: default;
        }
      `}</style>

      <div
        ref={panelRef}
        style={{ position: 'fixed', top: '0.75rem', left: '0.75rem', zIndex: 50 }}
      >
        {/* Trigger badge */}
        <button
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Text display settings"
          aria-expanded={isOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            background: isOpen
              ? `linear-gradient(135deg, rgba(${GOLD_RGB},0.18), rgba(${GOLD_RGB},0.09))`
              : glassBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1.5px solid ${cardBorderColor}`,
            borderRadius: '12px',
            padding: '7px 11px',
            cursor: 'pointer',
            transition: 'border-color 0.2s, background 0.2s',
            boxShadow: isOpen
              ? `0 4px 24px rgba(0,0,0,${darkMode ? 0.4 : 0.1})`
              : `0 2px 12px rgba(0,0,0,${darkMode ? 0.3 : 0.07})`,
          }}
        >
          {/* Font preview letter */}
          <span
            style={{
              fontFamily: `'${currentFont}', serif`,
              fontSize: '18px',
              color: GOLD,
              lineHeight: 1,
              display: 'block',
            }}
          >
            ي
          </span>

          {/* Separator */}
          <span
            style={{
              width: 1,
              height: 14,
              background: `rgba(${GOLD_RGB},0.25)`,
              display: 'block',
              flexShrink: 0,
            }}
          />

          {/* Size label */}
          <span
            style={{
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              color: GOLD,
              opacity: 0.75,
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            {currentSizeData.label}
          </span>

          {/* Active toggles indicator */}
          {hasActiveToggles && (
            <span
              style={{
                display: 'flex',
                gap: 3,
                alignItems: 'center',
              }}
            >
              {showTranslation && (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: GOLD,
                    opacity: 0.65,
                  }}
                />
              )}
              {showTransliteration && (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: GOLD,
                    opacity: 0.45,
                  }}
                />
              )}
            </span>
          )}
        </button>

        {/* Expanded panel */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              width: '252px',
              background: glassBg,
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: `1.5px solid rgba(${GOLD_RGB},0.28)`,
              borderRadius: '16px',
              padding: '16px 14px',
              boxShadow: `0 24px 64px rgba(0,0,0,${darkMode ? 0.55 : 0.14}), 0 0 0 1px rgba(${GOLD_RGB},0.04)`,
              animation: 'textPanelIn 0.22s cubic-bezier(0.34,1.2,0.64,1) both',
            }}
          >
            {/* ── Font Size ── */}
            <p
              style={{
                fontSize: '8.5px',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: mutedColor,
                margin: '0 0 9px 0',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Font Size
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '15px',
              }}
            >
              {/* T− */}
              <button
                className="tsp-size-btn"
                onClick={decreaseSize}
                disabled={textSizeLevel === 0}
                aria-label="Decrease font size"
              >
                <span
                  style={{
                    color: GOLD,
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  T
                  <sup style={{ fontSize: '7px', verticalAlign: 'super' }}>−</sup>
                </span>
              </button>

              {/* Step dots */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                {TEXT_SIZES.map((s, i) => (
                  <button
                    key={s.label}
                    className={`tsp-size-dot ${i === textSizeLevel ? 'active' : ''}`}
                    style={{ width: i === textSizeLevel ? 22 : 7 }}
                    onClick={() => useUIStore.getState().setTextSize(i)}
                    aria-label={`Set font size to ${s.label}`}
                    title={s.label}
                  />
                ))}
              </div>

              {/* T+ */}
              <button
                className="tsp-size-btn"
                onClick={increaseSize}
                disabled={textSizeLevel === TEXT_SIZES.length - 1}
                aria-label="Increase font size"
              >
                <span
                  style={{
                    color: GOLD,
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    fontWeight: 700,
                    lineHeight: 1,
                    userSelect: 'none',
                  }}
                >
                  T
                  <sup style={{ fontSize: '7px', verticalAlign: 'super' }}>+</sup>
                </span>
              </button>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: dividerColor, margin: '0 0 13px 0' }} />

            {/* ── Translate + Romanize toggles ── */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '15px',
              }}
            >
              {/* Translate */}
              <button
                className="tsp-toggle-btn"
                onClick={() => useUIStore.getState().toggleTranslation()}
                aria-pressed={showTranslation}
                aria-label={showTranslation ? 'Hide translation' : 'Show translation'}
                style={{
                  border: `1.5px solid ${showTranslation ? `rgba(${GOLD_RGB},0.5)` : `rgba(${GOLD_RGB},0.14)`}`,
                  background: showTranslation
                    ? `rgba(${GOLD_RGB},0.11)`
                    : 'transparent',
                }}
              >
                <Languages
                  size={15}
                  color={showTranslation ? GOLD : mutedColor}
                  strokeWidth={1.75}
                />
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: showTranslation ? GOLD : mutedColor,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  Translate
                </span>
              </button>

              {/* Romanize */}
              <button
                className="tsp-toggle-btn"
                onClick={() => useUIStore.getState().toggleTransliteration()}
                aria-pressed={showTransliteration}
                aria-label={showTransliteration ? 'Hide romanization' : 'Show romanization'}
                style={{
                  border: `1.5px solid ${showTransliteration ? `rgba(${GOLD_RGB},0.5)` : `rgba(${GOLD_RGB},0.14)`}`,
                  background: showTransliteration
                    ? `rgba(${GOLD_RGB},0.11)`
                    : 'transparent',
                }}
              >
                <span
                  style={{
                    fontFamily: "'Amiri', serif",
                    fontSize: '15px',
                    color: showTransliteration ? GOLD : mutedColor,
                    lineHeight: 1,
                    display: 'block',
                  }}
                >
                  عA
                </span>
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: showTransliteration ? GOLD : mutedColor,
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  Romanize
                </span>
              </button>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: dividerColor, margin: '0 0 13px 0' }} />

            {/* ── Font Selector ── */}
            <p
              style={{
                fontSize: '8.5px',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: mutedColor,
                margin: '0 0 9px 0',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              Arabic Font
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
              }}
            >
              {FONTS.map((font) => {
                const active = currentFont === font.id;
                return (
                  <button
                    key={font.id}
                    className={`tsp-font-btn ${active ? 'active' : ''}`}
                    onClick={() => useUIStore.getState().setFont(font.id)}
                    title={font.label}
                    aria-pressed={active}
                    aria-label={`Use ${font.label} font`}
                  >
                    {/* Font preview glyph */}
                    <span
                      style={{
                        fontFamily: `'${font.id}', serif`,
                        fontSize: '20px',
                        color: active ? GOLD : textColor,
                        lineHeight: 1,
                        display: 'block',
                        transition: 'color 0.2s',
                      }}
                    >
                      ي
                    </span>
                    {/* Font name */}
                    <span
                      style={{
                        fontSize: '6.5px',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        color: active ? GOLD : mutedColor,
                        textAlign: 'center',
                        lineHeight: 1.2,
                        fontFamily: 'system-ui, sans-serif',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '100%',
                        transition: 'color 0.2s',
                      }}
                    >
                      {font.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TextSettingsPanel;
