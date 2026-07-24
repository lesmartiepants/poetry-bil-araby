import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Download,
  Share2,
  Link as LinkIcon,
  ListChecks,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import {
  SHARE_CARD_DESIGNS,
  CARD_WIDTH,
  CARD_HEIGHT,
  renderShareCard,
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
  layl: 'midnight whisper',
  mishkat: 'lantern in the niche',
  sahifa: 'poetry broadsheet',
  musnad: 'numbered margin',
  muqabala: 'facing columns',
  najma: 'star medallion',
  iqtibas: 'pull-quote',
};

// Accent color per style — chrome and preview frame inherit it.
const STYLE_ACCENTS = {
  diwan: '#c5a059',
  ibnMuqla: '#7a5a10',
  sinan: '#4fa6b7',
  zahaHadid: '#c864ff',
  hassanFathy: '#a0522d',
  layl: '#d4b463',
  mishkat: '#4fb7a0',
  sahifa: '#8e2a2a',
  musnad: '#c5a059',
  muqabala: '#c5a059',
  najma: '#c5a059',
  iqtibas: '#c5a059',
};

// Living dedication — typed out, erased, retyped.
const DEDICATION_PHRASES = ['to a friend', 'to a lover', 'to a stranger', 'to yourself'];

const DISSOLVE_MS = 300;
const DEFAULT_LINE_COUNT = 4;
const MAX_LINE_COUNT = 6;

/** Split a poem text field into trimmed, non-empty lines. */
function splitLines(text) {
  if (!text) return [];
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

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
 * The preview IS the export: the floating 4:5 card is the actual canvas
 * render (same pixels as the downloaded/shared PNG), so what you see is
 * exactly what you send. The folio chrome around it: a left-aligned
 * letter-opening header that types a living dedication, an arcade-arch
 * style selector over nine materials, and a glass dock with download /
 * share / copy-link — plus a lines panel where the reader chooses which
 * verses to include and how the text is set (centered or right).
 *
 * UI primary language: English (per brand direction).
 *
 * @param {{ poem: Object, onClose: () => void }} props
 */
export default function ShareCardModal({ poem, onClose }) {
  const [selectedDesign, setSelectedDesign] = useState('diwan');
  const [dissolving, setDissolving] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  // null = each design's own default alignment; 'center' | 'right' override it
  const [alignment, setAlignment] = useState(null);
  const canvasRef = useRef(null);
  const archRefs = useRef([]);
  const dissolveTimer = useRef(null);
  const toastTimer = useRef(null);
  const { text: dedicationText, typing } = useTypedDedication(DEDICATION_PHRASES);

  // ── Verse pairs and line selection ───────────────────────────────────
  const arabicLines = useMemo(() => splitLines(poem.arabic), [poem.arabic]);
  const englishLines = useMemo(
    () => splitLines(poem.english || poem.cachedTranslation),
    [poem.english, poem.cachedTranslation]
  );
  const [selectedLines, setSelectedLines] = useState(() =>
    arabicLines.slice(0, DEFAULT_LINE_COUNT).map((_, i) => i)
  );

  // The poem actually rendered on the card — only the chosen lines.
  const sharePoem = useMemo(
    () => ({
      ...poem,
      arabic: selectedLines.map((i) => arabicLines[i]).join('\n'),
      english: selectedLines
        .map((i) => englishLines[i])
        .filter(Boolean)
        .join('\n'),
      cachedTranslation: null,
    }),
    [poem, selectedLines, arabicLines, englishLines]
  );

  const renderOpts = useMemo(
    () => ({
      align: alignment || undefined,
      maxLines: Math.max(selectedLines.length, 1),
    }),
    [alignment, selectedLines.length]
  );

  // ── WYSIWYG preview: the canvas render IS the preview ────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CARD_WIDTH;
    canvas.height = CARD_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return; // No canvas support (e.g. test environment)
    renderShareCard(ctx, CARD_WIDTH, CARD_HEIGHT, sharePoem, selectedDesign, renderOpts);
    setPreviewUrl(canvas.toDataURL('image/png'));
  }, [sharePoem, selectedDesign, renderOpts]);

  useEffect(() => {
    redraw();
    // Redraw once webfonts land so the preview uses the real typefaces.
    let stale = false;
    document.fonts?.ready?.then(() => {
      if (!stale) redraw();
    });
    return () => {
      stale = true;
    };
  }, [redraw]);

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

  // ── Line selection ───────────────────────────────────────────────────
  const toggleLine = (index) => {
    setSelectedLines((prev) => {
      if (prev.includes(index)) {
        if (prev.length === 1) {
          showToast('Keep at least one line');
          return prev;
        }
        return prev.filter((i) => i !== index);
      }
      if (prev.length >= MAX_LINE_COUNT) {
        showToast(`Up to ${MAX_LINE_COUNT} lines fit the card`);
        return prev;
      }
      return [...prev, index].sort((a, b) => a - b);
    });
  };

  // ── Export actions — same canvas as the preview ──────────────────────
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `poem-${poem.id || 'card'}-${selectedDesign}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('Card saved to Photos');
  };

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

  const handleCopyLink = async () => {
    const poemUrl = poem.id ? `${window.location.origin}/poem/${poem.id}` : window.location.origin;
    try {
      await navigator.clipboard.writeText(poemUrl);
      showToast('Link copied');
    } catch {
      showToast('Could not copy link');
    }
  };

  // ── Escape: close the panel first, then the modal ────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (panelOpen) setPanelOpen(false);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, panelOpen]);

  return (
    <div
      className="scm-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Share poem card"
      style={{ '--scm-card-accent': STYLE_ACCENTS[selectedDesign] }}
    >
      {/* Floating card — the exact canvas render that gets downloaded */}
      <div className="scm-stage">
        <figure
          className={`scm-preview${dissolving ? ' scm-dissolving' : ''}`}
          data-style={selectedDesign}
        >
          <img src={previewUrl || ''} alt="Share card preview" draggable="true" />
        </figure>
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

      {/* Tap-outside scrim — only while the lines panel is open, so tapping the
          card (or anywhere above the sheet) dismisses the panel. */}
      {panelOpen && (
        <div
          className="scm-scrim"
          aria-hidden="true"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Bottom shelf — arcade selector, material caption, glass dock */}
      <div className="scm-shelf">
        {panelOpen ? (
          <div className="scm-panel" role="group" aria-label="Choose lines">
            <div className="scm-panel-head">
              <div className="scm-panel-titles">
                <span className="scm-panel-title-ar" dir="rtl" lang="ar">
                  اختر الأبيات
                </span>
                <span className="scm-panel-title">Choose the lines</span>
              </div>
              <div className="scm-align-group" role="group" aria-label="Text alignment">
                <button
                  aria-label="Align center"
                  aria-pressed={alignment === 'center'}
                  onClick={() => setAlignment((a) => (a === 'center' ? null : 'center'))}
                >
                  <AlignCenter size={15} aria-hidden="true" />
                </button>
                <button
                  aria-label="Align right"
                  aria-pressed={alignment === 'right'}
                  onClick={() => setAlignment((a) => (a === 'right' ? null : 'right'))}
                >
                  <AlignRight size={15} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="scm-panel-list">
              {arabicLines.map((line, i) => (
                <button
                  key={i}
                  className="scm-line-row"
                  role="checkbox"
                  aria-checked={selectedLines.includes(i)}
                  onClick={() => toggleLine(i)}
                >
                  <span className="scm-line-check" aria-hidden="true" />
                  <span className="scm-line-texts">
                    <span className="scm-line-ar" dir="rtl" lang="ar">
                      {line}
                    </span>
                    {englishLines[i] && <span className="scm-line-en">{englishLines[i]}</span>}
                  </span>
                </button>
              ))}
            </div>

            <div className="scm-panel-foot">
              <span className="scm-panel-count">
                {selectedLines.length} of {arabicLines.length} lines
              </span>
              <button className="scm-panel-done" onClick={() => setPanelOpen(false)}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
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
              <button
                className="scm-btn-ghost"
                aria-label="Choose lines"
                onClick={() => setPanelOpen(true)}
              >
                <ListChecks size={17} aria-hidden="true" />
              </button>
              <button
                className="scm-btn-ghost"
                aria-label="Download as image"
                onClick={handleDownload}
              >
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
          </>
        )}
      </div>

      <div className={`scm-toast${toast.visible ? ' scm-show' : ''}`} role="status">
        {toast.message}
      </div>

      {/* Hidden full-size canvas — the single source of truth for preview & export */}
      <canvas ref={canvasRef} className="scm-hidden-canvas" aria-hidden="true" />
    </div>
  );
}
