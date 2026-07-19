import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Share2, Link as LinkIcon } from 'lucide-react';
import {
  SHARE_CARD_DESIGNS,
  CARD_WIDTH,
  CARD_HEIGHT,
  renderShareCard,
  resolveBilingual,
  prepareVerses,
  prepareTranslation,
} from '../utils/shareCardDesigns';
import '../styles/share-card-modal.css';

// ── Folio 3.4B design data ────────────────────────────────────────────
// Material captions — the arcade shows no style names, just the material.
const STYLE_CAPTIONS = {
  diwan: 'gold foil on obsidian',
  ibnMuqla: 'illuminated vellum',
  sinan: 'celestial geometry',
  zahaHadid: 'fluid neon',
  hassanFathy: 'sunlit clay',
};

// Accent color per style — the top chrome dedication inherits it.
const STYLE_ACCENTS = {
  diwan: '#c5a059',
  ibnMuqla: '#7a5a10',
  sinan: '#4fa6b7',
  zahaHadid: '#c864ff',
  hassanFathy: '#a0522d',
};

// Living dedication — typed out, erased, retyped.
const DEDICATION_PHRASES = ['to a friend', 'to a lover', 'to a stranger', 'to yourself'];

const DISSOLVE_MS = 300;

/**
 * Typewriter loop for the dedication line. Types each phrase, holds,
 * erases, and moves to the next. Respects prefers-reduced-motion by
 * rendering the first phrase statically.
 *
 * @returns {{ text: string, typing: boolean }}
 */
function useTypedDedication(phrases) {
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  // Reduced motion: render the first phrase statically from the start.
  const [text, setText] = useState(() => (reducedMotion() ? phrases[0] : ''));
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (reducedMotion()) return undefined;

    let timer = null;
    let phraseIdx = 0;
    const typeDelay = () => 58 + Math.random() * 48;

    const typeLoop = () => {
      const phrase = phrases[phraseIdx];
      let i = 0;
      setTyping(true);

      const typeChar = () => {
        if (i <= phrase.length) {
          setText(phrase.slice(0, i));
          i += 1;
          timer = setTimeout(typeChar, typeDelay());
        } else {
          setTyping(false);
          timer = setTimeout(erase, 1700);
        }
      };

      const erase = () => {
        setTyping(true);
        let j = phrase.length;
        const eraseChar = () => {
          if (j >= 0) {
            setText(phrase.slice(0, j));
            j -= 1;
            timer = setTimeout(eraseChar, 34);
          } else {
            setTyping(false);
            phraseIdx = (phraseIdx + 1) % phrases.length;
            timer = setTimeout(typeLoop, 380);
          }
        };
        eraseChar();
      };

      typeChar();
    };

    timer = setTimeout(typeLoop, 1000);
    return () => clearTimeout(timer);
  }, [phrases]);

  return { text, typing };
}

/**
 * ShareCardModal — Folio 3.4B "Dedication: Block Cursor".
 *
 * Full-bleed share experience: the poem card fills the screen and restyles
 * live as the user picks a material from the arcade-arch selector. A
 * left-aligned letter-opening header types out a living dedication
 * ("Send this poem — to a friend / to a lover / …"). Actions live in a
 * glass dock: download PNG, native share, copy link.
 *
 * The downloadable/shareable PNG is still rendered by the canvas designs
 * in `shareCardDesigns.js` on a hidden canvas.
 *
 * UI primary language: English (per brand direction).
 *
 * @param {{ poem: Object, onClose: () => void }} props
 */
export default function ShareCardModal({ poem, onClose }) {
  const [selectedDesign, setSelectedDesign] = useState('diwan');
  const [dissolving, setDissolving] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false });
  const canvasRef = useRef(null);
  const archRefs = useRef([]);
  const dissolveTimer = useRef(null);
  const toastTimer = useRef(null);
  const { text: dedicationText, typing } = useTypedDedication(DEDICATION_PHRASES);

  // ── Card content (mirrors the canvas renderers' bilingual handling) ──
  const resolvedPoet = resolveBilingual(poem.poet, poem.poetArabic);
  const resolvedTitle = resolveBilingual(poem.title, poem.titleArabic);
  const verses = prepareVerses(poem.arabic, 4);
  const translation = prepareTranslation(poem.english || poem.cachedTranslation, 4);

  useEffect(
    () => () => {
      clearTimeout(dissolveTimer.current);
      clearTimeout(toastTimer.current);
    },
    []
  );

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2200);
  }, []);

  // ── Style switching with dissolve transition ─────────────────────────
  const selectStyle = (id) => {
    if (id === selectedDesign) return;
    navigator.vibrate?.(5);
    setDissolving(true);
    clearTimeout(dissolveTimer.current);
    dissolveTimer.current = setTimeout(() => {
      setSelectedDesign(id);
      setDissolving(false);
    }, DISSOLVE_MS);
  };

  const handleArchKeyDown = (e, index) => {
    let next = null;
    if (e.key === 'ArrowRight') next = Math.min(index + 1, SHARE_CARD_DESIGNS.length - 1);
    if (e.key === 'ArrowLeft') next = Math.max(index - 1, 0);
    if (next !== null) {
      e.preventDefault();
      archRefs.current[next]?.focus();
      selectStyle(SHARE_CARD_DESIGNS[next].id);
    }
  };

  // ── PNG generation on the hidden canvas ──────────────────────────────
  const drawCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null; // No canvas support (e.g. test environment)
    renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, poem, selectedDesign);
    return canvas;
  };

  const handleDownload = () => {
    const canvas = drawCard();
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `poem-${poem.id || 'card'}-${selectedDesign}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Card saved');
  };

  const handleShare = async () => {
    const canvas = drawCard();
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

  const handleCopyLink = async () => {
    const poemUrl = poem.id ? `${window.location.origin}/poem/${poem.id}` : window.location.origin;
    try {
      await navigator.clipboard.writeText(poemUrl);
      showToast('Link copied');
    } catch {
      showToast('Could not copy link');
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
      className="scm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Share poem card"
      style={{ '--scm-card-accent': STYLE_ACCENTS[selectedDesign] }}
    >
      {/* Full-bleed card — the card IS the screen */}
      <div
        className={`scm-card${dissolving ? ' scm-dissolving' : ''}`}
        data-style={selectedDesign}
        aria-label="Poem card preview"
      >
        <div className="scm-card-frame" aria-hidden="true" />
        <div className="scm-card-body">
          {resolvedTitle.arabic && (
            <div className="scm-arabic-title" dir="rtl" lang="ar">
              {resolvedTitle.arabic}
            </div>
          )}
          {verses.length > 0 && (
            <p className="scm-arabic-poetry" dir="rtl" lang="ar">
              {verses.map((verse, i) => (
                <span key={i} className="scm-verse">
                  {verse}
                </span>
              ))}
            </p>
          )}
          {translation.length > 0 && (
            <>
              <div className="scm-divider" aria-hidden="true" />
              <p className="scm-english-translation" lang="en">
                {translation.map((line, i) => (
                  <span key={i} className="scm-verse">
                    {line}
                  </span>
                ))}
              </p>
            </>
          )}
          <div className="scm-poet">
            {resolvedPoet.arabic && (
              <span className="scm-poet-ar" dir="rtl" lang="ar">
                {resolvedPoet.arabic}
              </span>
            )}
            {resolvedPoet.english && <span className="scm-poet-en">{resolvedPoet.english}</span>}
          </div>
        </div>
        <div className="scm-brand" aria-hidden="true">
          <span className="scm-brand-ar">بالعربي</span>
          <span className="scm-brand-en">poetry</span>
        </div>
      </div>

      {/* Top chrome — the share heading as a living dedication */}
      <div className="scm-top-chrome">
        <span className="scm-ded-ar" dir="rtl" lang="ar">
          شارِك
        </span>
        <span className="scm-ded-main" lang="en">
          Send this poem
        </span>
        <span
          className={`scm-ded-type${typing ? ' scm-typing' : ''}`}
          lang="en"
          aria-label="to a friend, to a lover, to a stranger, to yourself"
        >
          <span className="scm-type-text">{dedicationText}</span>
          <span className="scm-type-cursor" aria-hidden="true" />
        </span>
      </div>

      <button className="scm-btn-close" aria-label="Close" onClick={onClose}>
        <X size={15} aria-hidden="true" />
      </button>

      {/* Bottom shelf — arcade selector, material caption, glass dock */}
      <div className="scm-shelf">
        <div className="scm-arcade" role="radiogroup" aria-label="Card style">
          {SHARE_CARD_DESIGNS.map((design, i) => (
            <button
              key={design.id}
              ref={(el) => {
                archRefs.current[i] = el;
              }}
              className={`scm-arch scm-arch--${design.id}`}
              role="radio"
              aria-checked={selectedDesign === design.id}
              aria-label={`${design.name} style`}
              tabIndex={selectedDesign === design.id ? 0 : -1}
              onClick={() => selectStyle(design.id)}
              onKeyDown={(e) => handleArchKeyDown(e, i)}
            >
              <span className="scm-mini" aria-hidden="true">
                <i />
                <i />
                <i />
                <em />
              </span>
              <span className="scm-arch-sill" aria-hidden="true" />
            </button>
          ))}
        </div>

        <div
          className={`scm-arcade-caption${dissolving ? ' scm-swapping' : ''}`}
          aria-live="polite"
        >
          {STYLE_CAPTIONS[selectedDesign]}
        </div>

        <div className="scm-dock" role="group" aria-label="Share actions">
          <button className="scm-btn-ghost" aria-label="Download as image" onClick={handleDownload}>
            <Download size={17} aria-hidden="true" />
          </button>
          <button className="scm-btn-share" onClick={handleShare}>
            <Share2 size={16} aria-hidden="true" />
            Share
          </button>
          <button className="scm-btn-ghost" aria-label="Copy link" onClick={handleCopyLink}>
            <LinkIcon size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className={`scm-toast${toast.visible ? ' scm-show' : ''}`} role="status">
        {toast.message}
      </div>

      {/* Hidden full-size canvas for PNG generation */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
}
