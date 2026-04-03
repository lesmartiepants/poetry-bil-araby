import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';

const GOLD = '#c5a059';
const LAPIS = '#1E3A5F';

const CLASSICAL_ERAS = [
  { slug: 'pre-islamic',   name_ar: '\u0645\u0627 \u0642\u0628\u0644 \u0627\u0644\u0625\u0633\u0644\u0627\u0645', name_en: 'Pre-Islamic' },
  { slug: 'early-islamic',  name_ar: '\u0635\u062f\u0631 \u0627\u0644\u0625\u0633\u0644\u0627\u0645', name_en: 'Early Islamic' },
  { slug: 'umayyad',       name_ar: '\u0623\u0645\u0648\u064a',       name_en: 'Umayyad' },
  { slug: 'abbasid',       name_ar: '\u0639\u0628\u0627\u0633\u064a',       name_en: 'Abbasid' },
  { slug: 'andalusian',    name_ar: '\u0623\u0646\u062f\u0644\u0633\u064a',    name_en: 'Andalusian' },
  { slug: 'ottoman',       name_ar: '\u0639\u062b\u0645\u0627\u0646\u064a',       name_en: 'Ottoman' },
];

const MODERN_ERAS = [
  { slug: 'modern',       name_ar: '\u062d\u062f\u064a\u062b',  name_en: 'Modern (1900\u20131970)' },
  { slug: 'contemporary', name_ar: '\u0645\u0639\u0627\u0635\u0631', name_en: 'Contemporary' },
];

const SUB_ERA_CONFIG = {
  classical: {
    label_ar: '\u0627\u0644\u062a\u0631\u0627\u062b',
    label_en: 'Classical',
    eras: CLASSICAL_ERAS,
    accentColor: GOLD,
    selectedBg: `${GOLD}22`,
    selectedBorder: GOLD,
  },
  modern: {
    label_ar: '\u0627\u0644\u062d\u062f\u064a\u062b',
    label_en: 'Modern',
    eras: MODERN_ERAS,
    accentColor: LAPIS,
    selectedBg: `${LAPIS}33`,
    selectedBorder: LAPIS,
  },
};

const SubEraPicker = ({ selectedPortals = [], onNext, initialValue = [] }) => {
  const [selected, setSelected] = useState(() => initialValue);
  const classicalRef = useRef(null);
  const modernRef = useRef(null);

  // GSAP stagger entrance on mount
  useEffect(() => {
    const refs = [
      { ref: classicalRef, portal: 'classical' },
      { ref: modernRef, portal: 'modern' },
    ];
    refs.forEach(({ ref, portal }) => {
      if (selectedPortals.includes(portal) && ref.current) {
        const chips = ref.current.querySelectorAll('[data-sub-era-chip]');
        gsap.fromTo(
          chips,
          { opacity: 0, y: 20, scale: 0.8 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.6)' }
        );
      }
    });
  }, [selectedPortals]);

  const toggleEra = (slug) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const handleNext = () => {
    onNext(selected);
  };

  const chipStyle = (isSelected, config) => ({
    padding: '8px 18px',
    borderRadius: '999px',
    border: `1px solid ${isSelected ? config.selectedBorder : 'rgba(255,255,255,0.15)'}`,
    background: isSelected ? config.selectedBg : 'rgba(255,255,255,0.04)',
    color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)',
    fontFamily: "'Tajawal', sans-serif",
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    direction: 'rtl',
  });

  const renderSection = (portalKey, ref) => {
    const config = SUB_ERA_CONFIG[portalKey];
    if (!config) return null;

    return (
      <div key={portalKey} style={{ marginBottom: '1.5rem' }}>
        <p
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '0.8rem',
            color: config.accentColor,
            marginBottom: '0.75rem',
            letterSpacing: '0.05em',
          }}
          lang="ar"
        >
          {config.label_ar}
          <span style={{ color: 'rgba(255,255,255,0.35)', marginRight: '0.5rem', fontSize: '0.7rem' }}>
            {config.label_en}
          </span>
        </p>
        <div
          ref={ref}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}
        >
          {config.eras.map((era) => (
            <button
              key={era.slug}
              data-testid="sub-era-chip"
              data-sub-era-chip
              onClick={() => toggleEra(era.slug)}
              style={chipStyle(selected.includes(era.slug), config)}
              lang="ar"
              aria-pressed={selected.includes(era.slug)}
            >
              {era.name_ar}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      data-testid="sub-era-picker"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '500px', padding: '2rem' }}>
        {/* Title */}
        <h2
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
            color: GOLD,
            marginBottom: '0.25rem',
            direction: 'rtl',
          }}
          lang="ar"
          dir="rtl"
        >
          {'\u0627\u062e\u062a\u0631 \u0627\u0644\u0639\u0635\u0648\u0631'}
        </h2>
        <p
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '2rem',
          }}
        >
          Choose your eras
        </p>

        {/* Era sections */}
        {selectedPortals.includes('classical') && renderSection('classical', classicalRef)}
        {selectedPortals.includes('modern') && renderSection('modern', modernRef)}

        {/* CTA */}
        <div style={{ marginTop: '2rem' }}>
          <button
            data-testid="sub-era-continue"
            onClick={handleNext}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 36px',
              border: `1px solid ${GOLD}`,
              borderRadius: '999px',
              background: 'transparent',
              color: GOLD,
              fontFamily: "'Tajawal', sans-serif",
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.3s ease',
              minHeight: '48px',
              direction: 'rtl',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${GOLD}22`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label={selected.length >= 1 ? '\u0627\u0644\u062a\u0627\u0644\u064a' : '\u062a\u062e\u0637\u0649'}
          >
            <span>{selected.length >= 1 ? '\u0627\u0644\u062a\u0627\u0644\u064a' : '\u062a\u062e\u0637\u0649'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SubEraPicker;
