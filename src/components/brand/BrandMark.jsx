import { Feather } from 'lucide-react';

/** Compact version of the established splash-screen wordmark. */
export default function BrandMark({ compact = false, className = '' }) {
  return (
    <div
      className={`inline-flex items-center justify-center ${compact ? 'gap-1.5' : 'gap-2'} ${className}`}
      aria-label="Poetry Bil-Araby"
    >
      <span
        className="font-brand-ar text-gold leading-none"
        style={{ fontSize: compact ? '1.05rem' : '1.4rem', fontWeight: 700 }}
        lang="ar"
        dir="rtl"
      >
        بالعربي
      </span>
      <span
        className="font-brand-en leading-none"
        style={{
          color: 'rgba(236,232,224,0.72)',
          fontSize: compact ? '0.8rem' : '1rem',
          letterSpacing: '0.04em',
        }}
      >
        poetry
      </span>
      <Feather
        aria-hidden="true"
        size={compact ? 14 : 18}
        strokeWidth={1.5}
        style={{ color: '#c5a059' }}
      />
    </div>
  );
}
