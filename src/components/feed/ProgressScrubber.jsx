import { useRef } from 'react';

/**
 * ProgressScrubber — the thin gold progress bar with a draggable handle.
 *
 * The reveal controller writes the fill width + handle position directly into the refs
 * (no per-frame React). Dragging the handle calls onScrub(frac) continuously and
 * onScrubEnd(frac) on release; the controller seeks/resumes from there. The root carries
 * `data-scrub` so the feed's Embla `watchDrag` predicate ignores drags that start here.
 */
export default function ProgressScrubber({
  total,
  goldColor = '#c5a059',
  visible = true,
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
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };

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
    e.stopPropagation(); // keep the vertical feed from also handling the scrub (horizontal-locked)
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
      className="flex justify-center items-center w-full transition-opacity duration-300"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        direction: 'ltr',
      }}
    >
      <div
        ref={barRef}
        className="relative"
        style={{
          width: 'min(190px, 56vw)',
          height: 3,
          borderRadius: 3,
          background: 'rgba(197,160,89,0.16)',
        }}
      >
        <i
          ref={scrubFillRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '0%',
            borderRadius: 3,
            background: `linear-gradient(90deg, ${goldColor}, #d4b463)`,
          }}
        />
        <span
          ref={scrubHandleRef}
          role="slider"
          aria-label="Seek through the poem"
          aria-valuemin={0}
          aria-valuemax={total}
          tabIndex={0}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{
            position: 'absolute',
            top: '50%',
            left: '0%',
            width: 15,
            height: 15,
            borderRadius: '50%',
            background: '#d4b463',
            boxShadow: '0 0 8px rgba(212,180,99,0.85)',
            transform: 'translate(-50%, -50%)',
            cursor: 'grab',
            touchAction: 'none',
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
}
