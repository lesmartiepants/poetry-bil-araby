import { useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { FEATURES } from '../constants/index.js';

gsap.registerPlugin(SplitText);

// Evaluated once at module load — MediaQueryList creation is cheap but calling
// matchMedia() on every render creates a new object each time unnecessarily.
const reducedMotionMQ =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const prefersReducedMotion = () => reducedMotionMQ?.matches ?? false;

/**
 * useSplitTextReveal — drives a word-by-word blur-up cascade for one stanza DOM node.
 *
 * Implements the Aurora Bloom reveal pattern:
 * - Each Arabic line (row) cascades after the previous with a lineDelay gap
 * - Within each line, words animate right-to-left (Arabic reading order: first DOM
 *   word = rightmost visual position in RTL) via default stagger from: 'start'
 * - Uses expo.out easing and a 12px → 0 blur for the aurora sparkle effect
 *
 * @param {boolean} active  — trigger the reveal animation
 * @param {Object}  options
 * @param {number}  options.stagger   — seconds between each word (default 0.05)
 * @param {number}  options.duration  — per-word fade duration in seconds (default 0.7)
 * @param {number}  options.lineDelay — delay between each row/line (default 0.15)
 * @param {boolean} options.skip      — permanently bypass (e.g. user scrolled past)
 *
 * @returns {{ containerRef: React.RefObject }} — attach to the stanza container div
 */
export function useSplitTextReveal(
  active,
  { stagger = 0.05, duration = 0.7, lineDelay = 0.15, skip = false } = {}
) {
  const containerRef = useRef(null);
  // Array of SplitText instances (one per line) — cleaned up on unmount
  const splitsRef = useRef([]);
  const hasRunRef = useRef(false);

  // Clean up all splits on unmount
  useEffect(() => {
    return () => {
      splitsRef.current.forEach((s) => {
        try {
          s.revert();
        } catch {
          /* already reverted */
        }
      });
      splitsRef.current = [];
    };
  }, []);

  useGSAP(
    () => {
      if (!active || hasRunRef.current || skip || !containerRef.current) return;
      hasRunRef.current = true;

      // Reduced-motion: simple fade-in, no split required
      if (prefersReducedMotion()) {
        gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35 });
        return;
      }

      // Each [data-split-target] is one Arabic line (row) within the stanza
      const lineEls = containerRef.current.querySelectorAll('[data-split-target]');
      if (lineEls.length === 0) {
        // Fallback: fade the whole container
        gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        return;
      }

      try {
        const splits = [];

        lineEls.forEach((lineEl, lineIdx) => {
          // Split each line into words; 'words' mode preserves RTL Arabic ligatures
          const split = new SplitText(lineEl, { type: 'words', wordsClass: 'gsap-word' });
          splits.push(split);

          const words = split.words;
          if (!words || words.length === 0) return;

          // Start invisible with bloom blur for aurora sparkle
          gsap.set(words, { opacity: 0, filter: 'blur(12px)', y: 8 });

          // Animate words right-to-left (Arabic reading order):
          // In a dir="rtl" element, DOM index 0 = first Arabic word = rightmost visual.
          // stagger from: 'start' (default) → index 0 animates first → right-to-left visually.
          gsap.to(words, {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            duration,
            stagger: { each: stagger, from: 'start' },
            ease: 'expo.out',
            delay: lineIdx * lineDelay,
            onComplete:
              lineIdx === lineEls.length - 1
                ? () => {
                    // Revert all splits after last line finishes so DOM stays clean
                    splits.forEach((s) => {
                      try {
                        s.revert();
                      } catch {
                        /* already reverted */
                      }
                    });
                    splitsRef.current = [];
                  }
                : undefined,
          });
        });

        splitsRef.current = splits;
      } catch (err) {
        // SplitText might fail on unusual Arabic text — fall back gracefully
        if (FEATURES.logging) console.warn('[StanzaReveal] SplitText fallback:', err);
        gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      }
    },
    { dependencies: [active, skip], scope: containerRef }
  );

  return { containerRef };
}
