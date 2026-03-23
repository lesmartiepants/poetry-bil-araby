import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import {
  SHARE_CARD_DESIGNS,
  CARD_WIDTH,
  CARD_HEIGHT,
  renderShareCard,
  prepareVerses,
  prepareTranslation,
  resolveBilingual,
} from '../utils/shareCardDesigns';

/**
 * ShareCardModal — Displays a beautiful share-card preview of the current poem
 * with 5 selectable design variants.  Users can download the card as PNG or
 * share it via the Web Share API.
 *
 * UI primary language: English (per brand direction).
 *
 * @param {{ poem: Object, onClose: () => void }} props
 */
export default function ShareCardModal({ poem, onClose }) {
  const [selectedDesign, setSelectedDesign] = useState('diwan');
  const canvasRef = useRef(null);
  const previewRef = useRef(null);

  // ── Render the card onto the hidden full-size canvas ──────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // No canvas support (e.g. test environment)
    renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, poem, selectedDesign);
  }, [poem, selectedDesign]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // ── Download the card as PNG ─────────────────────────────────────────
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `poem-${poem.id || 'card'}-${selectedDesign}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ── Share via Web Share API (with image file) ────────────────────────
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], `poem-${poem.id || 'card'}.png`, { type: 'image/png' });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: `${poem.titleArabic || poem.title || 'Arabic Poetry'} — ${poem.poetArabic || poem.poet || ''}`,
          files: [file],
        });
      } catch (e) {
        if (e.name !== 'AbortError') {
          // Fallback — download instead
          handleDownload();
        }
      }
    } else {
      // Fallback — download the image
      handleDownload();
    }
  };

  // ── Close on Escape ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Mini preview: draw to a visible smaller canvas ────────────────────
  useEffect(() => {
    const preview = previewRef.current;
    const source = canvasRef.current;
    if (!preview || !source) return;
    const pCtx = preview.getContext('2d');
    if (!pCtx) return; // No canvas support (e.g. test environment)
    const ratio = Math.min(preview.width / CARD_WIDTH, preview.height / CARD_HEIGHT);
    pCtx.clearRect(0, 0, preview.width, preview.height);
    pCtx.save();
    pCtx.scale(ratio, ratio);
    pCtx.drawImage(source, 0, 0);
    pCtx.restore();
  }, [selectedDesign, poem]);

  const verses = prepareVerses(poem?.arabic, 4);
  const translation = prepareTranslation(poem?.english || poem?.cachedTranslation, 4);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Share poem card"
    >
      <div className="relative w-full max-w-lg mx-4 bg-[#0c0c0e] border border-gold/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-stone-300 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Card preview area */}
        <div className="flex items-center justify-center p-6 pb-2">
          <div
            className="w-full max-w-[340px] rounded-xl overflow-hidden shadow-lg"
            style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
          >
            <ShareCardPreview
              poem={poem}
              design={SHARE_CARD_DESIGNS.find((d) => d.id === selectedDesign)}
              verses={verses}
              translation={translation}
            />
          </div>
        </div>

        {/* Design selector — English primary */}
        <div className="px-4 pt-2 pb-2">
          <p className="text-gold/50 text-xs text-center mb-2 font-tajawal tracking-wide">
            Choose Design
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            {SHARE_CARD_DESIGNS.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDesign(d.id)}
                aria-pressed={selectedDesign === d.id}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-tajawal transition-all duration-200
                  ${
                    selectedDesign === d.id
                      ? 'bg-gold/20 text-gold border border-gold/40 scale-105'
                      : 'bg-stone-900/40 text-stone-400 border border-stone-800/60 hover:border-gold/25 hover:text-gold/80'
                  }
                `}
                title={`${d.name} — ${d.artist}`}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>

        {/* Action buttons — English labels */}
        <div className="flex gap-3 p-4 pt-2 justify-center">
          <button
            onClick={handleDownload}
            aria-label="Download card"
            className="flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl hover:bg-gold/20 transition-all text-sm font-tajawal"
          >
            <Download size={16} />
            <span>Download</span>
          </button>
          <button
            onClick={handleShare}
            aria-label="Share card"
            className="flex items-center gap-2 px-5 py-2.5 bg-gold/20 text-gold border border-gold/30 rounded-xl hover:bg-gold/30 transition-all text-sm font-tajawal"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>

        {/* Hidden full-size canvas for PNG generation */}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        {/* Hidden scaled preview canvas */}
        <canvas ref={previewRef} width={340} height={425} className="hidden" aria-hidden="true" />
      </div>
    </div>
  );
}

// ── Design-specific background styles ──────────────────────────────────
const DESIGN_STYLES = {
  diwan: {
    bg: 'bg-[#0c0c0e]',
    border: 'border-[#c5a059]/40',
    poetColor: 'text-[#c5a059]',
    poetArColor: 'text-[#c5a059]/65',
    titleColor: 'text-[#c5a059]/55',
    verseColor: 'text-[#e8e0d0]',
    transColor: 'text-[#c5a059]/50',
    brandColor: 'text-[#c5a059]/55',
  },
  ibnMuqla: {
    bg: 'bg-gradient-to-b from-[#f5e6c8] via-[#f0ddb5] to-[#e8d1a0]',
    border: 'border-[#8B6914]',
    poetColor: 'text-[#4A2800]',
    poetArColor: 'text-[#4A2800]/65',
    titleColor: 'text-[#5C3A0A]/50',
    verseColor: 'text-[#2C1A00]',
    transColor: 'text-[#4A2800]/45',
    brandColor: 'text-[#8B6914]/50',
  },
  sinan: {
    bg: 'bg-gradient-to-b from-[#061424] via-[#0A1E38] to-[#061220]',
    border: 'border-[#4FA6B7]/40',
    poetColor: 'text-[#c5a059]',
    poetArColor: 'text-[#c5a059]/60',
    titleColor: 'text-[#4FA6B7]/55',
    verseColor: 'text-[#E8E4DC]',
    transColor: 'text-[#4FA6B7]/50',
    brandColor: 'text-[#c5a059]/50',
  },
  zahaHadid: {
    bg: 'bg-gradient-to-br from-[#08001A] via-[#150030] to-[#08001A]',
    border: 'border-[#C864FF]/30',
    poetColor: 'text-[#C864FF]',
    poetArColor: 'text-[#C864FF]/60',
    titleColor: 'text-[#64B4FF]/50',
    verseColor: 'text-[#F0E8FF]',
    transColor: 'text-[#96B4FF]/50',
    brandColor: 'text-[#C864FF]/50',
    textAlign: 'text-right',
  },
  hassanFathy: {
    bg: 'bg-gradient-to-b from-[#F8EDD8] via-[#F0DFC0] to-[#E5CFA5]',
    border: 'border-[#A0522D]/40',
    poetColor: 'text-[#3D1F00]',
    poetArColor: 'text-[#3D1F00]/60',
    titleColor: 'text-[#4A2800]/45',
    verseColor: 'text-[#2A1500]',
    transColor: 'text-[#4A2800]/42',
    brandColor: 'text-[#A0522D]/45',
  },
};

/**
 * ShareCardPreview — A styled HTML preview of the poem card
 * Shows bilingual poet & title (detects when both are Arabic, avoids duplication)
 * Interleaved Arabic verses + English translations
 */
function ShareCardPreview({ poem, design, verses, translation }) {
  const s = DESIGN_STYLES[design?.id] || DESIGN_STYLES.diwan;
  const align = s.textAlign || 'text-center';

  // Use shared bilingual detection
  const resolvedPoet = resolveBilingual(poem.poet, poem.poetArabic);
  const resolvedTitle = resolveBilingual(poem.title, poem.titleArabic);

  return (
    <div className={`h-full w-full flex flex-col justify-between ${s.bg} border-2 ${s.border} p-5`}>
      {/* Poet & Title — gold foil editorial hierarchy */}
      <div className={`${align} pt-3`}>
        {/* Poet name — prominent, gold foil */}
        {resolvedPoet.arabic && (
          <p
            className={`font-amiri font-bold text-lg ${s.poetColor}`}
            dir="rtl"
            style={{ textShadow: '0 0 12px rgba(197,160,89,0.1)' }}
          >
            {resolvedPoet.arabic}
          </p>
        )}
        {resolvedPoet.english && (
          <p className={`font-bold text-[15px] mt-0.5 ${s.poetArColor}`}>{resolvedPoet.english}</p>
        )}
        {/* Small separator */}
        <div
          className="mx-auto my-1.5"
          style={{
            width: '24px',
            height: '0.5px',
            background: 'currentColor',
            opacity: 0.3,
          }}
        />
        {/* Title — italic, editorial */}
        {resolvedTitle.arabic && (
          <p className={`font-amiri italic text-sm ${s.titleColor}`} dir="rtl">
            {resolvedTitle.arabic}
          </p>
        )}
        {resolvedTitle.english && resolvedTitle.english !== resolvedTitle.arabic && (
          <p className={`italic text-[11px] mt-0.5 ${s.titleColor} opacity-70`}>
            {resolvedTitle.english}
          </p>
        )}
      </div>

      {/* Interleaved verses + translations — line by line */}
      <div className={`${align} flex-1 flex flex-col justify-center gap-1.5 py-3`}>
        {verses.map((v, i) => (
          <div key={i} className="mb-1">
            <p className={`font-amiri text-[17px] leading-relaxed ${s.verseColor}`} dir="rtl">
              {v}
            </p>
            {translation[i] && (
              <p className={`italic text-[10px] leading-snug mt-0.5 ${s.transColor}`}>
                {translation[i]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Brand — bottom-right, single line */}
      <div className="flex justify-end pb-1 pr-1">
        <p className={`text-[10px] ${s.brandColor}`}>
          <span style={{ fontFamily: "'Forum', serif" }}>poetry </span>
          <span className="font-bold" style={{ fontFamily: "'Reem Kufi', sans-serif" }}>
            بالعربي
          </span>
        </p>
      </div>
    </div>
  );
}
