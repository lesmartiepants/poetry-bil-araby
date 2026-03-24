import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Share2 } from 'lucide-react';
import {
  SHARE_CARD_DESIGNS,
  CARD_WIDTH,
  CARD_HEIGHT,
  renderShareCard,
} from '../utils/shareCardDesigns';

/**
 * ShareCardModal — Displays a beautiful share-card preview of the current poem
 * with 5 selectable design variants.  Users can download the card as PNG or
 * share it via the Web Share API. The preview is rendered at full resolution
 * as an <img> (via canvas.toDataURL) so mobile users can long-press to save.
 *
 * UI primary language: English (per brand direction).
 *
 * @param {{ poem: Object, onClose: () => void }} props
 */
export default function ShareCardModal({ poem, onClose }) {
  const [selectedDesign, setSelectedDesign] = useState('diwan');
  const [previewDataUrl, setPreviewDataUrl] = useState(null);
  const canvasRef = useRef(null);

  // ── Render card onto hidden full-size canvas, then produce data URL ──
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // No canvas support (e.g. test environment)
    renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, poem, selectedDesign);
    setPreviewDataUrl(canvas.toDataURL('image/png'));
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

  // ── Share via Web Share API (with image file + poem link) ─────────────
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], `poem-${poem.id || 'card'}.png`, { type: 'image/png' });
    const poemUrl = poem.id ? `${window.location.origin}/poem/${poem.id}` : window.location.origin;
    const shareTitle = `${poem.titleArabic || poem.title || 'Arabic Poetry'} — ${poem.poetArabic || poem.poet || ''}`;

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: poemUrl,
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

        {/* Card preview area — full-res img for long-press save on mobile */}
        <div className="flex items-center justify-center p-6 pb-2">
          <div
            className="w-full max-w-[340px] rounded-xl overflow-hidden shadow-lg"
            style={{ aspectRatio: `${CARD_WIDTH} / ${CARD_HEIGHT}` }}
          >
            <img
              src={previewDataUrl || ''}
              alt="Share card preview"
              className="w-full h-full object-contain"
              draggable="true"
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
      </div>
    </div>
  );
}
