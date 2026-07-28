import { useMemo } from 'react';

/**
 * FamilyPicker — reusable taxonomy selector.
 *
 * Renders the emotional "families" as chips (bilingual label + live poem count)
 * and, below, every dimension's values as multi-select toggle chips. Fully
 * data-driven: whatever families / dimensions the API returns are rendered, so
 * a new family, dimension, or value appears automatically with no code change.
 *
 * Built as a standalone component so the future user-facing
 * "How do you want to feel?" surface can lift it directly.
 *
 * @param {object}   props
 * @param {Array}    props.families        - [{key,label_ar,label_en,poem_count,values:[{dim,key,...}]}]
 * @param {Array}    props.dimensions      - [{key,label_ar,label_en,values:[{key,label_ar,label_en,poem_count}]}]
 * @param {string|null} props.activeFamily - currently selected family key (single-select)
 * @param {Function} props.onSelectFamily  - (familyKey|null) => void  (toggles off when re-clicked)
 * @param {object}   props.selectedValues  - { [dimKey]: string[] } of active value chips
 * @param {Function} props.onToggleValue   - (dimKey, valueKey) => void
 * @param {boolean}  props.darkMode
 * @param {boolean}  [props.showDimensions=true] - render the per-dimension value chips
 */
export default function FamilyPicker({
  families = [],
  dimensions = [],
  activeFamily = null,
  onSelectFamily,
  selectedValues = {},
  onToggleValue,
  darkMode,
  showDimensions = true,
}) {
  const textColor = darkMode ? 'rgba(214,211,205,0.9)' : 'rgba(40,35,30,0.9)';
  const subTextColor = darkMode ? 'rgba(214,211,205,0.6)' : 'rgba(40,35,30,0.6)';
  const subtleBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const cardBg = darkMode ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)';

  const sortedFamilies = useMemo(
    () => [...families].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [families]
  );

  const chipBase =
    'rounded-full px-3 py-1.5 flex items-center gap-1.5 transition-all duration-200 border text-left';

  return (
    <div className="flex flex-col gap-4">
      {/* ── Family chips (single-select) ── */}
      {sortedFamilies.length > 0 && (
        <div>
          <p
            className="font-brand-en text-[0.5625rem] uppercase tracking-[0.15em] mb-2 px-0.5"
            style={{ color: 'var(--gold)', opacity: 0.55 }}
          >
            Families · العائلات
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sortedFamilies.map((fam) => {
              const active = activeFamily === fam.key;
              return (
                <button
                  key={fam.key}
                  onClick={() => onSelectFamily?.(active ? null : fam.key)}
                  className={`${chipBase} ${active ? 'border-gold/50 bg-gold/12' : 'hover:bg-gold/8'}`}
                  style={{
                    borderColor: active ? undefined : subtleBorder,
                    background: active ? undefined : cardBg,
                  }}
                  aria-pressed={active}
                >
                  <span
                    className="font-bold text-[0.8125rem]"
                    dir="rtl"
                    style={{
                      fontFamily: "'Reem Kufi', sans-serif",
                      color: active ? 'var(--gold)' : textColor,
                    }}
                  >
                    {fam.label_ar}
                  </span>
                  <span
                    className="font-brand-en text-[0.6875rem]"
                    dir="ltr"
                    style={{ color: active ? 'var(--gold)' : subTextColor, opacity: 0.85 }}
                  >
                    {fam.label_en}
                  </span>
                  {fam.poem_count > 0 && (
                    <span
                      className="font-brand-en text-[0.5625rem]"
                      style={{ color: 'var(--gold)', opacity: 0.45 }}
                    >
                      {Number(fam.poem_count).toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Per-dimension value chips (multi-select) ── */}
      {showDimensions &&
        dimensions.map((dim) => {
          const active = selectedValues[dim.key] || [];
          if (!Array.isArray(dim.values) || dim.values.length === 0) return null;
          return (
            <div key={dim.key}>
              <p
                className="font-brand-en text-[0.5625rem] uppercase tracking-[0.15em] mb-2 px-0.5"
                style={{ color: 'var(--gold)', opacity: 0.55 }}
              >
                {dim.label_en} · {dim.label_ar}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dim.values.map((val) => {
                  const on = active.includes(val.key);
                  return (
                    <button
                      key={val.key}
                      onClick={() => onToggleValue?.(dim.key, val.key)}
                      className={`${chipBase} ${on ? 'border-gold/50 bg-gold/12' : 'hover:bg-gold/8'}`}
                      style={{
                        borderColor: on ? undefined : subtleBorder,
                        background: on ? undefined : cardBg,
                      }}
                      aria-pressed={on}
                    >
                      <span
                        className="font-bold text-[0.75rem]"
                        dir="rtl"
                        style={{
                          fontFamily: "'Reem Kufi', sans-serif",
                          color: on ? 'var(--gold)' : textColor,
                        }}
                      >
                        {val.label_ar}
                      </span>
                      <span
                        className="font-brand-en text-[0.625rem]"
                        dir="ltr"
                        style={{ color: on ? 'var(--gold)' : subTextColor, opacity: 0.8 }}
                      >
                        {val.label_en}
                      </span>
                      {val.poem_count > 0 && (
                        <span
                          className="font-brand-en text-[0.5625rem]"
                          style={{ color: 'var(--gold)', opacity: 0.4 }}
                        >
                          {Number(val.poem_count).toLocaleString()}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
