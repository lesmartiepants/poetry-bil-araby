import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { THEME, GOLD } from '../../constants/index.js';

/**
 * A pill badge for a single tag.
 *
 * Props:
 *   tag        — { id, name_ar, name_en, color? }
 *   count      — optional integer shown after the label (e.g. poem count)
 *   onClick    — optional click handler; makes the badge interactive
 *   active     — boolean; highlights the badge as selected/active
 *   size       — 'sm' | 'md' (default 'sm')
 */
const TagBadge = React.memo(function TagBadge({
  tag,
  count,
  onClick,
  active = false,
  size = 'sm',
}) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;

  if (!tag) return null;

  // Use tag's color accent if provided, otherwise fall back to gold/lapis palette
  const accentColor = tag.color || 'rgba(197,160,89,1)'; // gold default
  const lapisColor = '#1B4F72'; // lapis lazuli

  const sizeStyles =
    size === 'md'
      ? { fontSize: '0.75rem', padding: '0.3rem 0.75rem', gap: '0.35rem' }
      : { fontSize: '0.65rem', padding: '0.2rem 0.55rem', gap: '0.25rem' };

  const activeStyle = active
    ? {
        background: darkMode ? 'rgba(197,160,89,0.18)' : 'rgba(197,160,89,0.12)',
        borderColor: 'rgba(197,160,89,0.7)',
        color: 'var(--gold)',
      }
    : {
        background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        borderColor: darkMode ? 'rgba(197,160,89,0.2)' : 'rgba(107,87,68,0.2)',
        color: darkMode ? 'rgba(212,200,180,0.8)' : 'rgba(60,40,20,0.7)',
      };

  const hoverStyle = onClick
    ? {
        cursor: 'pointer',
      }
    : {};

  const label = tag.name_ar || tag.name_en || '';
  const labelEn = tag.name_en || '';

  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? () => onClick(tag) : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(tag);
              }
            }
          : undefined
      }
      aria-pressed={onClick ? active : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '999px',
        border: '1px solid',
        fontFamily: "'Tajawal', 'Noto Sans Arabic', sans-serif",
        fontWeight: 500,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        transition: 'all 0.2s ease',
        userSelect: 'none',
        ...sizeStyles,
        ...activeStyle,
        ...hoverStyle,
      }}
    >
      {/* Arabic name (primary) */}
      <span dir="rtl" style={{ fontFamily: "'Amiri', serif" }}>
        {label}
      </span>

      {/* English name (secondary, if different) */}
      {labelEn && labelEn !== label && (
        <span
          dir="ltr"
          style={{
            fontFamily: "'Forum', serif",
            opacity: 0.6,
            fontSize: '0.85em',
          }}
        >
          {labelEn}
        </span>
      )}

      {/* Count badge */}
      {typeof count === 'number' && (
        <span
          style={{
            marginLeft: '0.3rem',
            background: active ? 'rgba(197,160,89,0.25)' : 'rgba(128,128,128,0.15)',
            borderRadius: '999px',
            padding: '0 0.35rem',
            fontSize: '0.85em',
            fontFamily: "'Tajawal', sans-serif",
          }}
        >
          {count}
        </span>
      )}
    </span>
  );
});

export default TagBadge;
