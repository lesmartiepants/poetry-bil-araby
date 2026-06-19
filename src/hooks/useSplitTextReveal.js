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
 * @param {boolean} active  — trigger the reveal animation
 * @param {Object}  options
 * @param {number}  options.stagger  — seconds between each word (default 0.04)
 * @param {number}  options.duration — per-word duration in seconds (default 0.5)
 * @param {boolean} options.skip     — permanently bypass (e.g. user scrolled past)
 *
 * @returns {{ containerRef: React.RefObject }} — attach to the stanza container div
 */
export function useSplitTextReveal(active, { stagger = 0.04, duration = 0.5, skip = false } = {}) {
  const containerRef = useRef(null);
  const splitRef = useRef(null);
  const hasRunRef = useRef(false);

  // Clean up split on unmount
  useEffect(() => {
    return () => {
      if (splitRef.current) {
        try {
          splitRef.current.revert();
        } catch {
          /* already reverted */
        }
        splitRef.current = null;
      }
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

      // Split Arabic text by words only (chars would break RTL ligatures)
      const wordEls = containerRef.current.querySelectorAll('[data-split-target]');
      if (wordEls.length === 0) {
        // Fallback: fade the whole container
        gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
        return;
      }

      try {
        splitRef.current = new SplitText(wordEls, { type: 'words', wordsClass: 'gsap-word' });
        const words = splitRef.current.words;
        if (!words || words.length === 0) {
          gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
          return;
        }

        // Initial hidden state
        gsap.set(words, { opacity: 0, filter: 'blur(8px)', y: 6 });

        gsap.to(words, {
          opacity: 1,
          filter: 'blur(0px)',
          y: 0,
          duration,
          stagger,
          ease: 'power2.out',
          onComplete: () => {
            // Revert after animation so DOM is clean for re-renders
            if (splitRef.current) {
              splitRef.current.revert();
              splitRef.current = null;
            }
          },
        });
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
