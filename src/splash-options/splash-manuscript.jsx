import React, { useState, useEffect } from 'react';
import { Moon, Sun, X } from 'lucide-react';

/* =============================================================================
  OPTION G: PAPER UNFOLD - Ancient Manuscript Unfurling

  Design Direction: Ancient manuscript unfurling with tactile, historical feel

  Features:
  - SVG simulating paper/parchment unfurling animation
  - Paper grain and aging texture via SVG filters
  - Arabic calligraphy reveals as paper unfolds
  - 3D illusion using gradients and shadows
  - Sepia/aged color palette
  - Touch to accelerate unfurl
  - Mobile-first responsive design
  - Ancient manuscripts meets origami aesthetic
  =============================================================================*/

export const SplashManuscript = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const [unfurlProgress, setUnfurlProgress] = useState(0);
  const [isUnfurling, setIsUnfurling] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    // Auto-start unfurl animation after mount
    const timer = setTimeout(() => {
      setIsUnfurling(true);
      setHasStarted(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isUnfurling) return;

    const duration = 3000; // 3 seconds for full unfurl
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setUnfurlProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [isUnfurling]);

  const handleAccelerate = () => {
    if (!hasStarted) {
      setIsUnfurling(true);
      setHasStarted(true);
    } else if (unfurlProgress < 1) {
      // Accelerate to completion
      setUnfurlProgress(1);
    }
  };

  // Color palette: Sepia/aged tones
  const colors = darkMode ? {
    bg: '#1a1512',
    paper: '#2d2419',
    paperLight: '#3d3428',
    text: '#c9b896',
    textDark: '#8b7355',
    accent: '#d4a574',
    shadow: 'rgba(0, 0, 0, 0.7)',
    border: '#4a3f2f',
  } : {
    bg: '#f5ede1',
    paper: '#f8f3e6',
    paperLight: '#fdfaf2',
    text: '#5d4e3a',
    textDark: '#3d2f1f',
    accent: '#8b6f47',
    shadow: 'rgba(61, 47, 31, 0.3)',
    border: '#d4c4a8',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden cursor-pointer"
      style={{ backgroundColor: colors.bg }}
      onClick={handleAccelerate}
    >
      {/* Theme toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleTheme();
        }}
        className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full border flex items-center justify-center transition-all hover:scale-110"
        style={{
          borderColor: colors.border,
          backgroundColor: colors.paper,
        }}
      >
        {darkMode ? (
          <Sun size={16} style={{ color: colors.accent }} />
        ) : (
          <Moon size={16} style={{ color: colors.accent }} />
        )}
      </button>

      {/* Ambient paper texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' seed='1'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main manuscript SVG container */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full max-w-5xl max-h-[90vh]"
          style={{ filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.3))' }}
        >
          <defs>
            {/* Paper texture filter */}
            <filter id="paperTexture" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="5" seed="2" />
              <feColorMatrix type="saturate" values="0" />
              <feComponentTransfer>
                <feFuncA type="discrete" tableValues="0.05" />
              </feComponentTransfer>
              <feBlend mode="multiply" in2="SourceGraphic" />
            </filter>

            {/* Aging/stain effect */}
            <filter id="aging" x="-50%" y="-50%" width="200%" height="200%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="5" />
              <feColorMatrix type="saturate" values="0.3" />
              <feComponentTransfer>
                <feFuncA type="discrete" tableValues="0 0.03 0.05 0.02 0" />
              </feComponentTransfer>
              <feBlend mode="multiply" in2="SourceGraphic" />
            </filter>

            {/* Crease shadow gradient for 3D effect */}
            <linearGradient id="creaseShadow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colors.shadow} stopOpacity="0.6" />
              <stop offset="30%" stopColor={colors.shadow} stopOpacity="0.2" />
              <stop offset="50%" stopColor={colors.paperLight} stopOpacity="0" />
              <stop offset="100%" stopColor={colors.paperLight} stopOpacity="0" />
            </linearGradient>

            {/* Paper highlight gradient */}
            <linearGradient id="paperHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.paperLight} stopOpacity="0.8" />
              <stop offset="100%" stopColor={colors.paper} stopOpacity="1" />
            </linearGradient>

            {/* Unfurl mask - reveals content from right to left */}
            <mask id="unfurlMask">
              <rect
                x={800 - (800 * unfurlProgress)}
                y="0"
                width={800 * unfurlProgress}
                height="600"
                fill="white"
              />
            </mask>
          </defs>

          {/* Background manuscript base */}
          <rect
            x="0"
            y="0"
            width="800"
            height="600"
            fill={colors.paper}
            filter="url(#paperTexture)"
          />

          {/* Aging stains overlay */}
          <rect
            x="0"
            y="0"
            width="800"
            height="600"
            fill={colors.paper}
            filter="url(#aging)"
            opacity="0.6"
          />

          {/* Folded section (right side) - simulates origami fold */}
          <g
            opacity={1 - unfurlProgress}
            transform={`translate(${unfurlProgress * 100}, 0)`}
          >
            {/* Folded paper edge with 3D effect */}
            <path
              d={`M ${650 - unfurlProgress * 200} 0 L 800 0 L 800 600 L ${650 - unfurlProgress * 200} 600 Z`}
              fill="url(#paperHighlight)"
            />

            {/* Crease shadow for depth */}
            <rect
              x={650 - unfurlProgress * 200}
              y="0"
              width="150"
              height="600"
              fill="url(#creaseShadow)"
            />

            {/* Paper edge highlight */}
            <line
              x1={650 - unfurlProgress * 200}
              y1="0"
              x2={650 - unfurlProgress * 200}
              y2="600"
              stroke={colors.paperLight}
              strokeWidth="2"
              opacity="0.5"
            />
          </g>

          {/* Content revealed as paper unfurls */}
          <g mask="url(#unfurlMask)">
            {/* Decorative border - manuscript style */}
            <rect
              x="40"
              y="40"
              width="720"
              height="520"
              fill="none"
              stroke={colors.border}
              strokeWidth="2"
              opacity="0.6"
            />

            {/* Corner ornaments */}
            <g opacity="0.5">
              {/* Top-left corner */}
              <path
                d="M 60 60 L 100 60 M 60 60 L 60 100"
                stroke={colors.accent}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Top-right corner */}
              <path
                d="M 740 60 L 700 60 M 740 60 L 740 100"
                stroke={colors.accent}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Bottom-left corner */}
              <path
                d="M 60 540 L 100 540 M 60 540 L 60 500"
                stroke={colors.accent}
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Bottom-right corner */}
              <path
                d="M 740 540 L 700 540 M 740 540 L 740 500"
                stroke={colors.accent}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </g>

            {/* Arabic calligraphy title - بالعربي */}
            <text
              x="400"
              y="160"
              textAnchor="middle"
              style={{
                fontFamily: 'Amiri, serif',
                fontSize: '72px',
                fontWeight: 'bold',
                fill: colors.text,
                letterSpacing: '0.05em',
              }}
            >
              بالعربي
            </text>

            {/* English title - poetry */}
            <text
              x="400"
              y="210"
              textAnchor="middle"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '48px',
                fontWeight: '300',
                fontStyle: 'italic',
                fill: colors.textDark,
                letterSpacing: '0.1em',
              }}
            >
              poetry
            </text>

            {/* Decorative divider */}
            <g opacity="0.6">
              <line
                x1="300"
                y1="245"
                x2="380"
                y2="245"
                stroke={colors.accent}
                strokeWidth="2"
              />
              <circle
                cx="400"
                cy="245"
                r="4"
                fill={colors.accent}
              />
              <line
                x1="420"
                y1="245"
                x2="500"
                y2="245"
                stroke={colors.accent}
                strokeWidth="2"
              />
            </g>

            {/* Headline - Arabic */}
            <text
              x="400"
              y="290"
              textAnchor="middle"
              style={{
                fontFamily: 'Amiri, serif',
                fontSize: '22px',
                fill: colors.text,
                opacity: 0.9,
                letterSpacing: '0.03em',
              }}
            >
              حكمة الأجداد محفوظة في المخطوطات
            </text>

            {/* Headline - English */}
            <text
              x="400"
              y="325"
              textAnchor="middle"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '18px',
                fontStyle: 'italic',
                fill: colors.textDark,
                opacity: 0.8,
                letterSpacing: '0.08em',
              }}
            >
              Ancient wisdom preserved in timeless manuscripts
            </text>

            {/* Body copy - Arabic */}
            <text
              x="400"
              y="365"
              textAnchor="middle"
              style={{
                fontFamily: 'Amiri, serif',
                fontSize: '16px',
                fill: colors.textDark,
                opacity: 0.7,
              }}
            >
              كل قصيدة كنز من التراث
            </text>

            {/* Body copy - English */}
            <text
              x="400"
              y="390"
              textAnchor="middle"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                fill: colors.textDark,
                opacity: 0.6,
                letterSpacing: '0.12em',
              }}
            >
              EVERY POEM A TREASURE FROM OUR HERITAGE
            </text>

            {/* Call to action button (appears when fully unfurled) */}
            {unfurlProgress > 0.8 && (
              <g
                onClick={(e) => {
                  e.stopPropagation();
                  onGetStarted();
                }}
                style={{ cursor: 'pointer' }}
                opacity={Math.min((unfurlProgress - 0.8) / 0.2, 1)}
              >
                <rect
                  x="300"
                  y="420"
                  width="200"
                  height="50"
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth="2"
                  rx="4"
                  className="hover:fill-current transition-all"
                  style={{ fill: unfurlProgress >= 1 ? colors.paper : 'none' }}
                />
                <text
                  x="400"
                  y="453"
                  textAnchor="middle"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '14px',
                    fontWeight: '600',
                    fill: colors.accent,
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                  }}
                  className="pointer-events-none"
                >
                  ENTER
                </text>
              </g>
            )}

            {/* Flourish at bottom */}
            <g opacity="0.4">
              <path
                d="M 350 510 Q 400 495 450 510"
                fill="none"
                stroke={colors.accent}
                strokeWidth="1.5"
              />
              <circle cx="350" cy="510" r="2" fill={colors.accent} />
              <circle cx="450" cy="510" r="2" fill={colors.accent} />
            </g>
          </g>

          {/* Animated paper curl at edge (3D effect) */}
          {unfurlProgress < 1 && (
            <g opacity={1 - unfurlProgress}>
              <ellipse
                cx={800 - (800 * unfurlProgress) - 10}
                cy="300"
                rx="15"
                ry="250"
                fill={colors.paperLight}
                opacity="0.8"
              />
              <ellipse
                cx={800 - (800 * unfurlProgress) - 10}
                cy="300"
                rx="8"
                ry="240"
                fill={colors.shadow}
                opacity="0.3"
              />
            </g>
          )}
        </svg>

        {/* Touch instruction - fades out as unfurl begins */}
        {unfurlProgress < 0.3 && (
          <div
            className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-center transition-opacity duration-500"
            style={{
              opacity: Math.max(0, 1 - unfurlProgress * 5),
              color: colors.textDark,
            }}
          >
            <p className="text-sm tracking-widest uppercase" style={{ fontFamily: 'Georgia, serif' }}>
              {unfurlProgress < 0.05 ? 'Touch to unfurl' : 'Touch to accelerate'}
            </p>
          </div>
        )}
      </div>

      {/* Subtle vignette effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, transparent 40%, ${colors.bg} 100%)`,
          opacity: 0.6,
        }}
      />
    </div>
  );
};

/* =============================================================================
  WALKTHROUGH GUIDE - Ancient Manuscript Theme (COMPLETELY REDESIGNED)

  Design Philosophy:
  - Museum-quality ancient codex with horizontal unfurling reveal (matches splash)
  - Progressive parchment aging texture reveals content organically
  - Gold leaf illuminated letters with shimmer animation
  - Manuscript marginalia decorations in margins
  - Paper curl edge effect showing unfurling boundary
  - Tactile corner page lifts with realistic shadows
  - Medieval scribe typography with classical letter spacing
  - Each transition: carefully turning fragile ancient pages
  - Scholarly, timeless, poetic copy matching manuscript tradition
  =============================================================================*/

export const WalkthroughManuscript = ({ onClose, darkMode, currentStep = 0, onStepChange }) => {
  const [pageTransition, setPageTransition] = useState(false);
  const [unfurlProgress, setUnfurlProgress] = useState(0);
  const [goldLeafShimmer, setGoldLeafShimmer] = useState(0);
  const [touchCorner, setTouchCorner] = useState(null); // 'next' or 'prev'

  // Same sepia/aged color palette as splash
  const colors = darkMode ? {
    bg: '#1a1512',
    paper: '#2d2419',
    paperLight: '#3d3428',
    text: '#c9b896',
    textDark: '#8b7355',
    accent: '#d4a574',
    shadow: 'rgba(0, 0, 0, 0.7)',
    border: '#4a3f2f',
  } : {
    bg: '#f5ede1',
    paper: '#f8f3e6',
    paperLight: '#fdfaf2',
    text: '#5d4e3a',
    textDark: '#3d2f1f',
    accent: '#8b6f47',
    shadow: 'rgba(61, 47, 31, 0.3)',
    border: '#d4c4a8',
  };

  // Horizontal unfurl reveal animation (matches splash's paper unfurling)
  useEffect(() => {
    const duration = 1200; // Slower, more deliberate like turning ancient pages
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setUnfurlProgress(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    setUnfurlProgress(0);
    requestAnimationFrame(animate);
  }, [currentStep]);

  // Gold leaf shimmer animation for illuminated letters
  useEffect(() => {
    const duration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % duration) / duration;
      // Smooth sine wave shimmer
      setGoldLeafShimmer(Math.sin(progress * Math.PI * 2) * 0.5 + 0.5);
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, []);

  // 3-step structure with scholarly, manuscript-inspired copy
  const steps = [
    {
      titleAr: "تصفح صفحات القرون",
      titleEn: "Turn Pages Through Centuries",
      descriptionAr: "تجول عبر مخطوطات الزمن. تصفح أبيات المتنبي وشعراء العصور المحفوظة في صفحات الخلود",
      descriptionEn: "Wander through manuscripts of time. Turn pages to discover verses of al-Mutanabbi and poets preserved for eternity",
      icon: "pages",
      illuminatedLetter: "T", // Turn
      marginalia: "Folio I"
    },
    {
      titleAr: "أنصت للتلاوة القديمة",
      titleEn: "Hear Ancient Recitations",
      descriptionAr: "استمع للأبيات تُتلى كما تليت في الديوان. صوت الشعر ينبض من المخطوطات",
      descriptionEn: "Listen as verses are recited from the diwan. The voice of poetry resonates through ancient scrolls",
      icon: "sound",
      illuminatedLetter: "H", // Hear
      marginalia: "Folio II"
    },
    {
      titleAr: "أضئ الحكمة المخفية",
      titleEn: "Illuminate Hidden Wisdom",
      descriptionAr: "اكشف التفاسير والمعاني العميقة. كل بيت مزخرف بطبقات من الحكمة في هوامش الصفحات",
      descriptionEn: "Unveil interpretations and profound meanings. Each verse adorned with layers of wisdom in the margins",
      icon: "wisdom",
      illuminatedLetter: "I", // Illuminate
      marginalia: "Folio III"
    }
  ];

  const step = steps[currentStep];

  // 3D Page turn animation handler with cinematic timing
  const handleStepChange = (newStep) => {
    if (newStep !== currentStep && newStep >= 0 && newStep < steps.length) {
      setPageTransition(true);
      setTimeout(() => {
        onStepChange(newStep);
        setPageTransition(false);
      }, 300);
    }
  };

  // Render illuminated capital letter with gold leaf shimmer (medieval manuscript style)
  const renderIlluminatedLetter = (letter) => {
    // Dynamic shimmer opacity based on animation
    const shimmerOpacity = 0.6 + (goldLeafShimmer * 0.4);

    return (
      <svg width="96" height="96" viewBox="0 0 96 96" fill="none" className="mb-4">
        <defs>
          {/* Gold leaf gradient with shimmer */}
          <linearGradient id={`goldLeaf-${currentStep}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={shimmerOpacity} />
            <stop offset="50%" stopColor={darkMode ? '#e5b886' : '#a68658'} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.accent} stopOpacity={shimmerOpacity * 0.8} />
          </linearGradient>
          {/* Paper texture for background */}
          <filter id="letterPaper" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" seed="3" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="discrete" tableValues="0.08" />
            </feComponentTransfer>
          </filter>
        </defs>

        {/* Parchment background with texture */}
        <rect x="6" y="6" width="84" height="84" rx="6" fill={colors.paperLight} filter="url(#letterPaper)" opacity="0.8" />

        {/* Decorative double border */}
        <rect x="6" y="6" width="84" height="84" rx="6" stroke={colors.accent} strokeWidth="2.5" fill="none" />
        <rect x="12" y="12" width="72" height="72" rx="4" stroke={colors.accent} strokeWidth="1" fill="none" opacity="0.5" />

        {/* Ornate corner flourishes with gold leaf */}
        <path d="M16 16 L26 16 L16 26 Z" fill={`url(#goldLeaf-${currentStep})`} opacity="0.5" />
        <path d="M80 16 L70 16 L80 26 Z" fill={`url(#goldLeaf-${currentStep})`} opacity="0.5" />
        <path d="M16 80 L26 80 L16 70 Z" fill={`url(#goldLeaf-${currentStep})`} opacity="0.5" />
        <path d="M80 80 L70 80 L80 70 Z" fill={`url(#goldLeaf-${currentStep})`} opacity="0.5" />

        {/* Filigree patterns in corners */}
        <circle cx="22" cy="22" r="2" fill={colors.accent} opacity={shimmerOpacity} />
        <circle cx="74" cy="22" r="2" fill={colors.accent} opacity={shimmerOpacity} />
        <circle cx="22" cy="74" r="2" fill={colors.accent} opacity={shimmerOpacity} />
        <circle cx="74" cy="74" r="2" fill={colors.accent} opacity={shimmerOpacity} />

        {/* Illuminated capital letter with shadow depth */}
        <text
          x="48"
          y="64"
          textAnchor="middle"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '48px',
            fontWeight: 'bold',
            fill: `url(#goldLeaf-${currentStep})`,
            filter: `drop-shadow(0 3px 6px ${colors.shadow})`,
          }}
        >
          {letter}
        </text>

        {/* Decorative flourishes around letter with shimmer */}
        <path d="M28 48 Q32 42 36 48" stroke={colors.accent} strokeWidth="1.5" fill="none" opacity={shimmerOpacity * 0.6} />
        <path d="M60 48 Q64 42 68 48" stroke={colors.accent} strokeWidth="1.5" fill="none" opacity={shimmerOpacity * 0.6} />
      </svg>
    );
  };

  // Render custom icon based on step with manuscript illustration style
  const renderIcon = (iconType) => {
    const iconProps = {
      stroke: colors.accent,
      strokeWidth: "2",
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    };

    switch(iconType) {
      case "pages":
        return (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Back page with aged effect */}
            <path d="M18 12 L44 12 Q48 12 48 16 L48 48 Q48 52 44 52 L18 52 L18 12 Z" {...iconProps} opacity="0.4" />
            {/* Front page */}
            <path d="M14 16 L40 16 Q44 16 44 20 L44 52 Q44 56 40 56 L14 56 L14 16 Z" {...iconProps} />
            {/* Binding with decorative lines */}
            <path d="M14 16 L14 56" {...iconProps} strokeWidth="3" />
            <path d="M16 20 L16 52 M18 20 L18 52" {...iconProps} strokeWidth="1" opacity="0.3" />
            {/* Page corner fold */}
            <path d="M34 56 L44 46" {...iconProps} opacity="0.6" />
            {/* Text lines on page */}
            <path d="M22 28 L38 28 M22 34 L36 34 M22 40 L38 40" {...iconProps} opacity="0.4" strokeWidth="1.5" />
          </svg>
        );
      case "sound":
        return (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Oud/lute body */}
            <ellipse cx="32" cy="36" rx="14" ry="18" {...iconProps} strokeWidth="2.5" />
            {/* Neck */}
            <path d="M32 18 L32 8" {...iconProps} strokeWidth="4" />
            {/* Tuning pegs */}
            <circle cx="28" cy="8" r="2" fill={colors.accent} />
            <circle cx="32" cy="6" r="2" fill={colors.accent} />
            <circle cx="36" cy="8" r="2" fill={colors.accent} />
            {/* Strings */}
            <path d="M26 22 L26 50 M32 22 L32 50 M38 22 L38 50" {...iconProps} opacity="0.6" strokeWidth="1" />
            {/* Sound hole decoration - Islamic rosette */}
            <circle cx="32" cy="36" r="6" {...iconProps} opacity="0.5" />
            <circle cx="32" cy="36" r="3" {...iconProps} opacity="0.5" />
            {/* Sound waves */}
            <path d="M48 28 Q50 32 48 36" {...iconProps} opacity="0.3" strokeWidth="1.5" />
            <path d="M52 24 Q56 32 52 40" {...iconProps} opacity="0.2" strokeWidth="1.5" />
          </svg>
        );
      case "wisdom":
        return (
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            {/* Ancient manuscript scroll */}
            <path d="M16 20 L48 20 Q52 20 52 24 L52 52 Q52 56 48 56 L16 56 Q12 56 12 52 L12 24 Q12 20 16 20 Z" {...iconProps} strokeWidth="2.5" />
            {/* Scroll curls at edges */}
            <path d="M12 24 Q10 24 10 26 L10 50 Q10 52 12 52" {...iconProps} />
            <path d="M52 24 Q54 24 54 26 L54 50 Q54 52 52 52" {...iconProps} />
            {/* Inner decorative border */}
            <rect x="18" y="26" width="28" height="24" {...iconProps} opacity="0.4" strokeWidth="1" />
            {/* Illuminated manuscript decoration - geometric pattern */}
            <circle cx="32" cy="38" r="8" {...iconProps} opacity="0.5" />
            <path d="M32 30 L32 46 M24 38 L40 38" {...iconProps} opacity="0.4" strokeWidth="1" />
            <circle cx="32" cy="38" r="4" fill={colors.accent} opacity="0.3" />
            {/* Text lines suggesting ancient writing */}
            <path d="M20 30 L28 30 M36 30 L44 30" {...iconProps} opacity="0.3" strokeWidth="1" />
            <path d="M20 46 L28 46 M36 46 L44 46" {...iconProps} opacity="0.3" strokeWidth="1" />
            {/* Corner ornaments */}
            <circle cx="18" cy="26" r="1.5" fill={colors.accent} />
            <circle cx="46" cy="26" r="1.5" fill={colors.accent} />
            <circle cx="18" cy="50" r="1.5" fill={colors.accent} />
            <circle cx="46" cy="50" r="1.5" fill={colors.accent} />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-4"
      style={{
        backgroundColor: colors.bg,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' seed='1'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.15'/%3E%3C/svg%3E")`,
      }}
    >
      {/* Ambient parchment texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='aging'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.02' numOctaves='3' seed='5'/%3E%3CfeColorMatrix type='saturate' values='0.3'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23aging)' opacity='0.2'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, transparent 40%, ${colors.bg} 100%)`,
          opacity: 0.6,
        }}
      />

      {/* Close button - fixed position */}
      <button
        onClick={onClose}
        className="fixed top-6 right-6 rounded-full transition-all duration-300 hover:scale-110 z-50 flex items-center justify-center"
        style={{
          backgroundColor: colors.paperLight,
          color: colors.accent,
          minWidth: '44px',
          minHeight: '44px',
          boxShadow: `0 4px 12px ${colors.shadow}`,
        }}
        aria-label="Close walkthrough"
      >
        <X size={20} />
      </button>

      {/* Parchment page container with unfurling effect */}
      <div
        className="relative w-full max-w-3xl mx-auto rounded-sm overflow-hidden transition-all duration-300"
        style={{
          backgroundColor: colors.paper,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='5'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='discrete' tableValues='0.04'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23paper)'/%3E%3C/svg%3E")`,
          boxShadow: `0 25px 60px ${colors.shadow}, inset 0 0 0 1px ${colors.border}`,
          transform: pageTransition ? 'perspective(1200px) rotateY(8deg) scale(0.96)' : 'perspective(1200px) rotateY(0deg) scale(1)',
          opacity: pageTransition ? 0.7 : 1,
          transformStyle: 'preserve-3d',
          transitionDuration: '300ms',
          transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          minHeight: '75vh',
          maxHeight: '90vh',
        }}
      >
        {/* Unfurling overlay mask */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to right, ${colors.paper} ${100 - unfurlProgress * 100}%, transparent ${100 - unfurlProgress * 100}%)`,
            zIndex: 10,
          }}
        />

        {/* Paper curl edge effect (matches splash) */}
        {unfurlProgress < 0.98 && (
          <div
            className="absolute top-0 bottom-0 w-8 pointer-events-none"
            style={{
              left: `${100 - unfurlProgress * 100}%`,
              background: `linear-gradient(to right, ${colors.shadow} 0%, transparent 100%)`,
              opacity: 1 - unfurlProgress,
              zIndex: 9,
            }}
          />
        )}

        {/* Touch-optimized page corners for navigation */}
        {currentStep < steps.length - 1 && (
          <button
            onClick={() => handleStepChange(currentStep + 1)}
            onMouseEnter={() => setTouchCorner('next')}
            onMouseLeave={() => setTouchCorner(null)}
            className="absolute bottom-4 right-4 z-20 transition-all duration-300"
            style={{
              minWidth: '56px',
              minHeight: '56px',
              opacity: touchCorner === 'next' ? 1 : 0.5,
              transform: touchCorner === 'next' ? 'scale(1.1)' : 'scale(1)',
            }}
            aria-label="Next page"
          >
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <path
                d="M56 56 L56 36 Q56 28 48 28 L28 28 Q20 28 20 36 L20 56 Z"
                fill={colors.paperLight}
                stroke={colors.accent}
                strokeWidth="1.5"
              />
              <path
                d="M56 36 Q48 36 48 48 L48 56"
                fill="none"
                stroke={colors.shadow}
                strokeWidth="1"
                opacity="0.3"
              />
              <path
                d="M34 42 L40 46 L34 50"
                stroke={colors.accent}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        {currentStep > 0 && (
          <button
            onClick={() => handleStepChange(currentStep - 1)}
            onMouseEnter={() => setTouchCorner('prev')}
            onMouseLeave={() => setTouchCorner(null)}
            className="absolute bottom-4 left-4 z-20 transition-all duration-300"
            style={{
              minWidth: '56px',
              minHeight: '56px',
              opacity: touchCorner === 'prev' ? 1 : 0.5,
              transform: touchCorner === 'prev' ? 'scale(1.1)' : 'scale(1)',
            }}
            aria-label="Previous page"
          >
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
              <path
                d="M0 56 L0 36 Q0 28 8 28 L28 28 Q36 28 36 36 L36 56 Z"
                fill={colors.paperLight}
                stroke={colors.accent}
                strokeWidth="1.5"
              />
              <path
                d="M0 36 Q8 36 8 48 L8 56"
                fill="none"
                stroke={colors.shadow}
                strokeWidth="1"
                opacity="0.3"
              />
              <path
                d="M22 42 L16 46 L22 50"
                stroke={colors.accent}
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Main content with unfurl reveal */}
        <div
          className="relative flex flex-col items-center justify-center gap-6 px-8 md:px-16 py-12 md:py-16 text-center h-full"
          style={{
            opacity: unfurlProgress > 0.3 ? 1 : unfurlProgress / 0.3,
            transition: 'opacity 400ms ease-out',
          }}
        >
          {/* Manuscript marginalia - folio number */}
          <div
            className="absolute top-6 left-8 text-xs italic tracking-widest"
            style={{
              fontFamily: 'Georgia, serif',
              color: colors.textDark,
              opacity: 0.5,
            }}
          >
            {step.marginalia}
          </div>

          {/* Ornate border decorations */}
          <div
            className="absolute inset-4 pointer-events-none rounded-sm"
            style={{
              border: `1px solid ${colors.border}`,
              opacity: 0.4,
            }}
          />

          {/* Illuminated letter */}
          <div className="flex flex-col items-center">
            {renderIlluminatedLetter(step.illuminatedLetter)}

            {/* Icon */}
            <div
              className="p-5 rounded-md"
              style={{
                backgroundColor: colors.paperLight,
                boxShadow: `0 4px 12px ${colors.shadow}, inset 0 0 0 1px ${colors.border}`,
              }}
            >
              <div className="animate-pulse" style={{ animationDuration: '3s' }}>
                {renderIcon(step.icon)}
              </div>
            </div>

            {/* Decorative divider */}
            <svg width="120" height="20" viewBox="0 0 120 20" className="mt-4 opacity-50">
              <path
                d="M10 10 Q30 5 60 10 T110 10"
                stroke={colors.accent}
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
              <circle cx="10" cy="10" r="2" fill={colors.accent} />
              <circle cx="60" cy="10" r="2" fill={colors.accent} />
              <circle cx="110" cy="10" r="2" fill={colors.accent} />
            </svg>
          </div>

          {/* Titles */}
          <div className="space-y-2 max-w-xl">
            <h3
              className="text-3xl md:text-4xl font-bold leading-tight"
              style={{
                fontFamily: 'Amiri, serif',
                color: colors.text,
                letterSpacing: '0.02em',
              }}
            >
              {step.titleAr}
            </h3>
            <p
              className="text-xl md:text-2xl italic"
              style={{
                fontFamily: 'Georgia, serif',
                color: colors.textDark,
                opacity: 0.9,
                letterSpacing: '0.05em',
              }}
            >
              {step.titleEn}
            </p>
          </div>

          {/* Descriptions */}
          <div className="space-y-3 max-w-2xl">
            <p
              className="text-base md:text-lg leading-relaxed"
              style={{
                fontFamily: 'Amiri, serif',
                color: colors.text,
                opacity: 0.8,
              }}
              dir="rtl"
            >
              {step.descriptionAr}
            </p>
            <p
              className="text-sm md:text-base leading-relaxed"
              style={{
                fontFamily: 'Georgia, serif',
                color: colors.textDark,
                opacity: 0.7,
                letterSpacing: '0.03em',
              }}
            >
              {step.descriptionEn}
            </p>
          </div>

          {/* Step indicators - manuscript pages */}
          <div className="flex items-center gap-3 mt-4">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleStepChange(idx)}
                className="transition-all duration-500 hover:scale-110"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  width: idx === currentStep ? '32px' : '28px',
                  height: idx === currentStep ? '40px' : '34px',
                  backgroundColor: idx <= currentStep ? colors.accent : colors.border,
                  opacity: idx === currentStep ? 1 : idx < currentStep ? 0.7 : 0.3,
                  borderRadius: '2px',
                  boxShadow: idx === currentStep ? `0 4px 12px ${colors.shadow}` : 'none',
                  border: `1px solid ${idx === currentStep ? colors.accent : colors.border}`,
                }}
                aria-label={`Go to step ${idx + 1} of ${steps.length}`}
                aria-current={idx === currentStep ? 'step' : undefined}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-3 w-full max-w-md mt-4">
            {currentStep > 0 && (
              <button
                onClick={() => handleStepChange(currentStep - 1)}
                className="flex-1 border-2 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  borderColor: colors.border,
                  backgroundColor: colors.paperLight,
                  color: colors.text,
                  fontFamily: 'Georgia, serif',
                  borderRadius: '4px',
                  minHeight: '44px',
                  padding: '10px 20px',
                }}
                aria-label="Previous step"
              >
                <span className="text-sm">Previous</span>
                <span className="text-xs opacity-60" style={{ fontFamily: 'Amiri, serif' }}> السابق</span>
              </button>
            )}
            <button
              onClick={currentStep < steps.length - 1 ? () => handleStepChange(currentStep + 1) : onClose}
              className="flex-1 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
              style={{
                backgroundColor: colors.accent,
                color: colors.paper,
                fontFamily: 'Georgia, serif',
                fontWeight: 'bold',
                borderRadius: '4px',
                boxShadow: `0 4px 16px ${colors.shadow}`,
                minHeight: '44px',
                padding: '10px 24px',
              }}
              aria-label={currentStep < steps.length - 1 ? 'Next step' : 'Start exploring'}
            >
              <span className="text-sm">
                {currentStep < steps.length - 1 ? 'Next' : 'Start Exploring'}
              </span>
              <span className="text-xs opacity-80" style={{ fontFamily: 'Amiri, serif' }}>
                {currentStep < steps.length - 1 ? ' التالي' : ' ابدأ'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
