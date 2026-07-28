import { useRef } from 'react';

/**
 * ProgressScrubber — the thin gold progress rail with a draggable handle.
 *
 * VERTICAL rail (#613): full-height, anchored to the screen-right edge of the reading stage,
 * mapping top→bottom reading position. The reveal controller writes the fill HEIGHT + handle
 * TOP position directly into the refs (no per-frame React). Dragging the handle calls
 * onScrub(frac) continuously and onScrubEnd(frac) on release; the controller seeks/resumes from
 * there. frac is derived from pointer Y relative to the rail's top/height. The root carries
 * `data-scrub` so the feed's Embla `watchDrag` predicate ignores drags that start here.
 */
export default function ProgressScrubber({
  total,
  goldColor = '#c5a059',
  visible = true,
  showHandle = true,
  scrubFillRef,
  scrubHandleRef,
  onScrubStart,
  onScrub,
  onScrubEnd,
}) {
  const barRef = useRef(null);
  const draggingRef = useRef(false);

  const frac = (e) => {
    const el = barRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    // Vertical: pointer Y from the rail top, normalised over its height (top = 0, bottom = 1).
    return Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
  };

  // Pointer handlers live on a wide, full-height hit area (not the thin rail) so the scrubber is
  // easy to grab and tapping anywhere along the column seeks. The visible rail + handle stay thin.
  const onDown = (e) => {
    if (!total) return;
    e.stopPropagation();
    e.preventDefault();
    draggingRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    onScrubStart?.();
    onScrub?.(frac(e));
  };
  const onMove = (e) => {
    if (!draggingRef.current) return;
    e.stopPropagation(); // keep the vertical feed from also handling the scrub (pointer captured here)
    e.preventDefault();
    onScrub?.(frac(e));
  };
  const onUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.stopPropagation();
    e.preventDefault();
    onScrubEnd?.(frac(e));
  };

  return (
    <div
      data-scrub
      data-testid="progress-scrubber"
      className="flex justify-center items-stretch h-full transition-opacity duration-300"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        direction: 'ltr',
      }}
    >
      {/* Generous hit area: full-height + ≥44px wide so the thin rail is easy to grab on touch. */}
      <div
        role="slider"
        aria-label="Seek through the poem"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={total}
        tabIndex={0}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className="relative flex items-center justify-center"
        style={{
          // Wide (≥44px touch target), full-height hit area with vertical margins beyond the rail,
          // so a press ABOVE/BELOW the handle (or past the rail's end) still grabs and can be
          // dragged. frac is measured against the inner rail and clamped, so the top/bottom margins
          // map to the 0 / 1 ends.
          width: 44,
          height: '100%',
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 16,
          paddingRight: 16,
          cursor: 'grab',
          touchAction: 'none',
        }}
      >
        <div
          ref={barRef}
          className="relative h-full"
          style={{
            width: 3,
            borderRadius: 3,
            // Neutral grey track — the un-filled / un-scrolled portion reads as grey behind the
            // gold fill (reveal progress while reading, scroll position once an insight is loaded).
            background: 'rgba(160,160,160,0.3)',
          }}
        >
          <i
            ref={scrubFillRef}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '0%',
              borderRadius: 3,
              // Fill grows vertically from the top (top→bottom reading position).
              background: `linear-gradient(180deg, ${goldColor}, #d4b463)`,
              pointerEvents: 'none',
            }}
          />
          <span
            ref={scrubHandleRef}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              top: '0%',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#d4b463',
              boxShadow: '0 0 8px rgba(212,180,99,0.85)',
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              // Hidden when there's nothing to scrub/scroll to (e.g. insight text that fits).
              opacity: showHandle ? 1 : 0,
              transition: 'opacity 0.2s ease',
              zIndex: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}
