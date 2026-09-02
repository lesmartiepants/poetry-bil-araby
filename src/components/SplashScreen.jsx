import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { Feather } from 'lucide-react';
import { BRAND } from '../constants/design.js';
import { FEATURES } from '../constants/features.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { hasSavedPreferences } from '../utils/onboardingEntry.js';
import { createSparkler } from '../utils/sparkler.js';
import '../styles/tts-highlight.css';

/**
 * The owner's note, as paragraphs of SENTENCES. The sentence is the reveal's unit — one `ignite`
 * each, in order — so the split is data rather than a regex at render time; "Al Mutanabbi" and
 * "100 others" are exactly the kind of thing sentence-splitting regexes get wrong.
 */
const NOTE_BLOCKS = [
  {
    sentences: [
      'Are you ready to experience Arabic poetry spanning two millennia?',
      "Available in both Arabic and English + learning tools like pronunciation and read-along, you'll be immersed at the first poem.",
    ],
  },
  {
    sentences: [
      'Plus, learn about the poem meaning beyond translation, and the story of the poet behind it.',
    ],
  },
  {
    sentences: [
      'Classical legends like Al Mutanabbi as well as modern greats like Mahmoud Darwish, and over 100 others in between.',
    ],
  },
  { sentences: ['Hope you enjoy it as I have.'], tight: true },
  // The signature is bilingual on one line, Arabic leading, in the same order and with the same
  // interpunct the reader uses for a poet's byline (`أبو الأسود الدؤلي · Abu al-Ala al-Ma'arri`).
  //
  // `whole` is not a style choice: Arabic is cursive, and splitting it into per-character spans
  // severs the joins, rendering سراج as four isolated letters. The line reveals as one beat with
  // its shaping intact rather than being taken apart to match the Latin text's mechanism.
  {
    sentences: ['— سراج · Siraj'],
    signature: true,
    whole: true,
    parts: [{ t: '— ' }, { t: 'سراج', ar: true }, { t: ' · Siraj' }],
  },
];

/** Flat, in reading order: the sequence `ignite` walks. */
const NOTE_SENTENCES = NOTE_BLOCKS.flatMap((b, blockIndex) =>
  b.sentences.map((text) => ({ text, blockIndex }))
);

/**
 * SplashScreen — first-visit landing screen ("Zen Haiku", design-review/splash/zen).
 *
 * A single still beat: brand mark, an ambient particle field, an intro paragraph, a "Let's Begin"
 * pill.
 * Dismissing it hands off to the preference-onboarding flow (/onboarding) the first time a
 * reader has no saved prefs yet; a returning reader (or one with the flow disabled) goes
 * straight into the feed. There is no walkthrough baked into this screen — that lives at
 * /onboarding, reachable again later from the account menu.
 */
const SplashScreen = () => {
  const [, navigate] = useLocation();
  const isOpen = useModalStore((s) => s.splash);
  const darkMode = useUIStore((s) => s.darkMode);
  const enterButtonRef = useRef(null);
  const canvasRef = useRef(null);
  const blockRefs = useRef([]);
  const sparkCanvasRef = useRef(null);
  const [revealDone, setRevealDone] = useState(false);

  const dismiss = (e) => {
    e.stopPropagation();
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {}
    const needsOnboarding = FEATURES.onboardingPrefs && !hasSavedPreferences();
    // Route first, dismiss second: the destination (onboarding route, or "/") commits in the
    // same pass as the splash unmounting, so there's no frame where the splash is gone but the
    // reader is showing through with nothing routed on top of it yet.
    navigate(needsOnboarding ? '/onboarding' : '/');
    useModalStore.getState().dismissSplash();
  };

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sparkle reveal — the same vocabulary the inline insights use (RevealText + .reveal-word /
  // .reveal-front in tts-highlight.css): words fade up in sequence and the leading word carries a
  // brief gold shimmer as the sweep passes through it. Written here rather than by reusing
  // RevealText because that component owns one string, its own scroller and the insight's
  // centred type; this note is five blocks with a signature.
  //
  // The CTA waits for this to finish. That is the point of the sequence: the note is addressed to
  // the reader, and offering the way out before the sentence lands invites skipping it.
  useEffect(() => {
    if (!isOpen) return undefined;
    const count = NOTE_SENTENCES.length;
    const units = () => blockRefs.current.slice(0, count);

    if (prefersReducedMotion || count === 0) {
      // The original's reduced-motion branch exactly: drop the clip and fade the unit in over 0.45s.
      units().forEach((el) => {
        if (!el) return;
        el.querySelectorAll('[data-c]').forEach((c) => {
          c.style.opacity = '1';
        });
      });
      setRevealDone(true);
      return undefined;
    }

    // The sparkler burns at the reveal head. Mobile gets a lighter spray: this canvas runs
    // alongside the ambient particle field, and the two together are the splash's whole frame cost.
    const isMobile = window.innerWidth <= 768;
    const sparkler = sparkCanvasRef.current
      ? createSparkler(sparkCanvasRef.current, {
          direction: 1, // the note is LTR, so the burn point travels right
          emitPerFrame: isMobile ? 4 : 8,
          maxParticles: isMobile ? 180 : 360,
        })
      : null;
    sparkler?.resize();
    const onResize = () => sparkler?.resize();
    window.addEventListener('resize', onResize);

    // `ignite`, ported from useSparklerReveal: one unit lit by a travelling head, with the sparkler
    // burning at it. The original's tuned constants are kept exactly — 1.4s per unit,
    // power1.inOut, emitter off at the end so the last sparks finish their arc.
    //
    // What could NOT be kept is its clip-path wipe. That worked because its unit was a single
    // Arabic verse line that never wrapped, so `inset(0 0 0 p%)` swept along the reading order. A
    // sentence of English prose wraps, and clip-path resolves against ONE box spanning every line
    // fragment, so the same wipe opens a vertical column through all three lines at once instead of
    // travelling through the sentence. Verified in the browser before changing approach.
    //
    // So the sweep is per word inside the unit, which follows reading order through wraps. Same
    // duration, same easing, same head, same sparks; only the thing being interpolated differs.
    const tweens = [];
    const ignite = (i) =>
      new Promise((resolve) => {
        const el = blockRefs.current[i];
        if (!el) {
          resolve();
          return;
        }
        sparkler?.resize();
        const chars = Array.from(el.querySelectorAll('[data-c]'));
        const n = chars.length;
        const obj = { p: 0 };
        sparkler?.setEmitting(true);

        // EDGE is the width of the reveal's leading gradient, in characters. The original's clip
        // edge was a hard sub-pixel line, which a per-element opacity ramp cannot reproduce, but
        // spreading the ramp over a few glyphs gets the same READ: letters coming up through a
        // moving edge rather than switching on. At 1 this looks like a typewriter, at 3 it looks
        // like the clip wipe did.
        const EDGE = 3;
        const paint = (p) => {
          const pos = Math.max(0, Math.min(1, p)) * n;
          for (let k = 0; k < n; k++) {
            const a = (pos - k) / EDGE;
            chars[k].style.opacity = a <= 0 ? '0' : a >= 1 ? '1' : a.toFixed(3);
          }
          const canvasEl = sparkCanvasRef.current;
          if (!sparkler || !canvasEl) return;
          // Interpolate ACROSS the boundary glyph rather than snapping to its edge: that is what
          // keeps the head gliding the way the original's `rect.width * p` did, instead of
          // teleporting a glyph at a time.
          const k = Math.max(0, Math.min(n - 1, Math.floor(pos)));
          const frac = Math.max(0, Math.min(1, pos - k));
          const r = chars[k].getBoundingClientRect();
          const c = canvasEl.getBoundingClientRect();
          sparkler.setHead(r.left - c.left + r.width * frac, r.top - c.top + r.height / 2);
        };

        paint(0);
        tweens.push(
          gsap.to(obj, {
            p: 1,
            duration: 1.4,
            ease: 'power1.inOut',
            onUpdate: () => paint(obj.p),
            onComplete() {
              paint(1);
              // The original faded its head element out over 0.4s here; the equivalent is to stop
              // feeding the emitter and let the sparks already in the air finish their arc.
              sparkler?.setEmitting(false);
              resolve();
            },
          })
        );
      });

    let cancelled = false;
    const run = async () => {
      // Let the wordmark finish resolving out of its blur before the first unit lights.
      await new Promise((r) => setTimeout(r, 850));
      for (let i = 0; i < count; i++) {
        if (cancelled) return;
        await ignite(i);
      }
      if (!cancelled) setRevealDone(true);
    };
    run();

    return () => {
      cancelled = true;
      tweens.forEach((t) => t.kill());
      window.removeEventListener('resize', onResize);
      sparkler?.stop();
    };
  }, [isOpen, prefersReducedMotion]);

  // Focus follows the button's arrival, not a fixed clock.
  useEffect(() => {
    if (!isOpen || !revealDone) return undefined;
    const id = setTimeout(() => enterButtonRef.current?.focus(), prefersReducedMotion ? 0 : 420);
    return () => clearTimeout(id);
  }, [isOpen, revealDone, prefersReducedMotion]);

  // Ambient particle field — ported from the option-2-haiku prototype (design-review/splash/zen).
  // Particles hold a home position, lean away from the pointer, and spring back; disabled outright
  // under reduced motion rather than frozen mid-layout, since a static scatter added nothing there.
  //
  // Performance: plain canvas + rAF rather than GSAP or DOM nodes — 400 individually-tweened DOM
  // particles would cost a style recalc per particle per frame, canvas costs one. Mobile (<=768px,
  // matching the desert splash's own mobile branch) halves the particle count, skips the outer
  // glow gradient (the single most expensive draw call per particle), and caps devicePixelRatio at
  // 2 so a 3x retina phone isn't rasterizing 3x the pixels for no visible gain.
  useEffect(() => {
    if (!isOpen || prefersReducedMotion) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const isMobile = window.innerWidth <= 768;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const sizeCanvas = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    sizeCanvas();

    // The field fills the whole band above the CTA rather than sitting in three tight clusters:
    // edge to edge horizontally, top of the screen down to just above the button. Density is
    // weighted toward the middle so the wordmark still reads as the centre of gravity.
    const FIELD_BOTTOM = 0.76; // fraction of viewport height where the CTA begins
    const particleCount = isMobile ? 170 : 460;
    const particles = Array.from({ length: particleCount }, () => {
      // Two uniform samples averaged = a soft centre bias, without the hard edges of a cluster.
      const bias = (Math.random() + Math.random()) / 2;
      const x = (0.5 + (bias - 0.5) * 1.9) * window.innerWidth;
      const y = Math.random() * FIELD_BOTTOM * window.innerHeight;
      return {
        x,
        y,
        originX: x,
        originY: y,
        vx: 0,
        vy: 0,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.4,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.04 + 0.02,
      };
    });

    // Pointer influence. Parked off-screen until the first real input so nothing is pushed around
    // by a phantom centre-screen cursor on a touch device. A tap counts: `push` gives it a short
    // burst of extra reach and force that decays, so a single tap visibly scatters the field
    // instead of needing a sustained drag.
    const pointer = { x: -9999, y: -9999, push: 0 };
    const track = (x, y, burst = 0) => {
      pointer.x = x;
      pointer.y = y;
      if (burst) pointer.push = burst;
    };
    const onMouseMove = (e) => track(e.clientX, e.clientY);
    const onTouch = (e) => {
      const t = e.touches?.[0];
      if (t) track(t.clientX, t.clientY, e.type === 'touchstart' ? 1 : 0);
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });

    let raf;
    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const core = darkMode ? 'rgba(200, 220, 255,' : 'rgba(100, 120, 140,';
      const glow = darkMode ? 'rgba(180, 200, 255,' : 'rgba(80, 100, 120,';
      const bright = darkMode ? 'rgba(255, 255, 255,' : 'rgba(0, 0, 0,';

      const reach = 120 + pointer.push * 90;
      const force = 1 + pointer.push * 1.6;
      pointer.push *= 0.92; // the tap burst decays back to plain hover strength

      particles.forEach((p) => {
        const dx = pointer.x - p.x;
        const dy = pointer.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < reach && d > 0) {
          const f = (reach - d) / reach;
          p.vx -= (dx / d) * f * force;
          p.vy -= (dy / d) * f * force;
        }
        p.vx += (p.originX - p.x) * 0.002;
        p.vy += (p.originY - p.y) * 0.002;
        p.vx *= 0.93;
        p.vy *= 0.93;
        p.x += p.vx;
        p.y += p.vy;

        p.twinklePhase += p.twinkleSpeed;
        const twinkle = Math.sin(p.twinklePhase) * 0.3 + 0.7;
        const fo = p.opacity * twinkle * 0.5;

        if (!isMobile) {
          ctx.beginPath();
          const g1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
          g1.addColorStop(0, `${core} ${fo * 0.6})`);
          g1.addColorStop(0.3, `${glow} ${fo * 0.3})`);
          g1.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g1;
          ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        if (isMobile) {
          ctx.fillStyle = `${bright} ${fo})`;
        } else {
          const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          g2.addColorStop(0, `${bright} ${fo})`);
          g2.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g2;
        }
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      raf = requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('resize', sizeCanvas);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('resize', sizeCanvas);
    };
  }, [isOpen, prefersReducedMotion, darkMode]);

  if (!isOpen) return null;

  const bg = darkMode ? '#000000' : '#fafaf9';
  const textPrimary = darkMode ? '#ffffff' : '#000000';
  const textSecondary = darkMode ? '#a8a8a8' : '#666666';
  const borderColor = darkMode ? '#1e1e24' : '#e0e0d8';

  const gold = '#c5a059';
  // The same warm off-white the reader's wordmark uses for "poetry", rather than pure white: it
  // has to sit beside gold without out-glaring it.
  const brandInk = darkMode ? '#D4D0C8' : '#1A1614';

  // The entrance is a cascade, not one block fade: the wordmark resolves out of a blur first, the
  // paragraph follows, the button arrives last. Each step is transform+opacity+filter only, so it
  // stays on the compositor and never touches layout.
  const splashStyles = `
    @keyframes splashZenFadeIn { to { opacity: 1; } }
    @keyframes splashZenRise {
      from { opacity: 0; transform: translateY(14px); filter: blur(10px); }
      to { opacity: 1; transform: translateY(0); filter: blur(0); }
    }
    @keyframes splashZenLift {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes splashZenAura {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.06); }
    }
    @keyframes splashZenPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(197,160,89,0); }
      50% { box-shadow: 0 0 0 7px rgba(197,160,89,0.05); }
    }
    /* The words sit lit rather than getting swept: a warm core with a halo around it, always on,
       breathing the way an ember does. The keyframe stops are deliberately UNEVEN — an even split
       reads as a metronome pulse, and embers do not pulse, they catch and settle. Two shadow layers
       do the work: a tight gold core for the glow on the letterforms, and a wide amber bloom for
       the heat coming off them. Paint-only on three words, so it costs nothing to keep running. */
    @keyframes splashZenEmber {
      0% {
        color: #e8cd8a;
        text-shadow: 0 0 5px rgba(197,160,89,0.45), 0 0 16px rgba(214,138,58,0.20);
      }
      17% {
        color: #f7e6ae;
        text-shadow: 0 0 9px rgba(226,186,102,0.80), 0 0 26px rgba(224,146,58,0.38);
      }
      31% {
        color: #eed49a;
        text-shadow: 0 0 6px rgba(197,160,89,0.55), 0 0 19px rgba(214,138,58,0.25);
      }
      52% {
        color: #fff0c4;
        text-shadow: 0 0 12px rgba(240,217,139,0.95), 0 0 32px rgba(232,150,60,0.48);
      }
      68% {
        color: #e8cd8a;
        text-shadow: 0 0 6px rgba(197,160,89,0.50), 0 0 18px rgba(214,138,58,0.24);
      }
      84% {
        color: #f4e0a6;
        text-shadow: 0 0 10px rgba(226,186,102,0.72), 0 0 24px rgba(224,146,58,0.34);
      }
      100% {
        color: #e8cd8a;
        text-shadow: 0 0 5px rgba(197,160,89,0.45), 0 0 16px rgba(214,138,58,0.20);
      }
    }
    .splash-zen-label {
      color: #e8cd8a;
      animation: splashZenEmber 5.5s ease-in-out 1.9s infinite;
    }
    /* Hover fans it: brighter and quicker, like breath on a coal. */
    .splash-zen-cta:hover .splash-zen-label,
    .splash-zen-cta:focus-visible .splash-zen-label { animation-duration: 2.6s; }
    /* The button takes focus programmatically the moment it arrives, so this ring is not
       hypothetical — and the browser default is a blue halo, the one colour on this screen that
       belongs to nothing else in the design. Same affordance, in gold. */
    .splash-zen-cta:focus-visible {
      outline: 2px solid rgba(197,160,89,0.75);
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: reduce) {
      .splash-zen-anim, .splash-zen-aura {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
      }
      /* Keep the ember lit, just stop it flickering. */
      .splash-zen-label {
        animation: none !important;
        color: #f0d98b;
        text-shadow: 0 0 8px rgba(197,160,89,0.6), 0 0 22px rgba(214,138,58,0.3);
      }
    }
  `;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // The note is four paragraphs plus a signature, so on a short viewport (a small phone, or
        // any phone in landscape) the block is taller than the screen. Centred flex content that
        // overflows gets clipped at BOTH ends and cannot be scrolled back, which would put the
        // only way into the app off-screen. Scrolling keeps the CTA reachable.
        overflowY: 'auto',
        padding: '2rem 2rem calc(2rem + env(safe-area-inset-bottom, 0px))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Poetry Bil-Araby"
    >
      <style>{splashStyles}</style>

      {!prefersReducedMotion && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* Aura — a single soft gold bloom behind the wordmark. It lifts the brand off pure black and
          gives the particle cluster something to sit in, without adding a visible shape. */}
      <div
        className="splash-zen-aura"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 'min(560px, 90vw)',
          height: 'min(560px, 90vw)',
          transform: 'translate(-50%, -50%)',
          background: darkMode
            ? 'radial-gradient(circle, rgba(197,160,89,0.10) 0%, rgba(197,160,89,0.04) 38%, transparent 68%)'
            : 'radial-gradient(circle, rgba(197,160,89,0.16) 0%, rgba(197,160,89,0.06) 38%, transparent 68%)',
          pointerEvents: 'none',
          zIndex: 1,
          animation: prefersReducedMotion ? 'none' : 'splashZenAura 7s ease-in-out infinite',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <div
          className="splash-zen-anim"
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '0.35em',
            marginBottom: '28px',
            opacity: prefersReducedMotion ? 1 : 0,
            animation: prefersReducedMotion
              ? 'none'
              : 'splashZenRise 1.1s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards',
          }}
        >
          {/* The app's own lockup, not a splash-only variant: warm off-white "poetry", gold
              بالعربي, gold quill — the same three parts, colours and order the reader's corner
              wordmark uses (BRAND_HEADER in app.jsx). The splash was rendering both words in flat
              white, so the one screen that introduces the brand was the one screen not wearing it. */}
          <span
            className="font-brand-en"
            style={{ ...BRAND.english, textTransform: 'lowercase', color: brandInk }}
          >
            poetry
          </span>
          <span
            className="font-brand-ar"
            style={{ ...BRAND.arabic, color: gold, textShadow: '0 0 40px rgba(197,160,89,0.3)' }}
            dir="rtl"
            lang="ar"
          >
            بالعربي
          </span>
          <Feather style={{ ...BRAND.feather, color: gold }} strokeWidth={1.5} />
        </div>

        {/* A note from the owner, so it is set as one: left-aligned prose rather than the centred
            marketing block it replaced (centring is fine for a one-line tagline and hostile to four
            paragraphs), with the sign-off and signature held apart from the body.
            Words carry the sparkle reveal; see the tween above. */}
        <div
          className="font-brand-en"
          style={{
            position: 'relative',
            fontSize: '0.875rem',
            lineHeight: 1.75,
            letterSpacing: '0.012em',
            color: textSecondary,
            maxWidth: '38ch',
            marginInline: 'auto',
            marginBottom: '36px',
            textAlign: 'left',
          }}
        >
          {/* Sparks are drawn OVER the words, and inset negatively so a spark thrown off the last
              word on a line is not clipped at the text's own edge — a canvas clips to its box. */}
          {!prefersReducedMotion && (
            <canvas
              ref={sparkCanvasRef}
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: '-44px',
                width: 'calc(100% + 88px)',
                height: 'calc(100% + 88px)',
                pointerEvents: 'none',
                zIndex: 3,
              }}
            />
          )}
          {NOTE_BLOCKS.map((block, blockIndex) => (
            <p
              key={blockIndex}
              style={{
                marginBottom: block.tight ? '0.3em' : block.signature ? 0 : '0.85em',
                ...(block.signature
                  ? { color: gold, fontStyle: 'italic', letterSpacing: '0.04em' }
                  : null),
              }}
            >
              {block.sentences.map((text) => {
                // Index into the flat reading order, which is what `ignite` walks.
                const unitIndex = NOTE_SENTENCES.findIndex(
                  (s) => s.blockIndex === blockIndex && s.text === text
                );
                return (
                  <span
                    key={unitIndex}
                    ref={(el) => {
                      blockRefs.current[unitIndex] = el;
                    }}
                  >
                    {/* Per character, so the reveal edge can move a glyph at a time rather than a
                        word at a time. Words stay wrapped in their own inline-block so a line can
                        only break at a space — without that, every character is its own break
                        opportunity and the paragraph shatters mid-word.
                        `whole` opts out entirely, for scripts that must not be cut into glyphs. */}
                    {block.whole ? (
                      <span data-c="" style={{ opacity: prefersReducedMotion ? 1 : 0 }}>
                        {(block.parts ?? [{ t: text }]).map((part, pi) =>
                          part.ar ? (
                            <span
                              key={pi}
                              className="font-brand-ar"
                              dir="rtl"
                              lang="ar"
                              // Same gold and same opacity as the Latin beside it — only the size
                              // differs. Reem Kufi has no italic, and faux-slanting Arabic is
                              // wrong, so the signature's slant stops at the script boundary.
                              style={{ fontSize: '1.2em', fontStyle: 'normal' }}
                            >
                              {part.t}
                            </span>
                          ) : (
                            <span key={pi}>{part.t}</span>
                          )
                        )}
                      </span>
                    ) : (
                      text.split(' ').map((word, wi) => (
                        <span key={wi} style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                          {word.split('').map((ch, ci) => (
                            <span
                              key={ci}
                              data-c=""
                              style={{ opacity: prefersReducedMotion ? 1 : 0 }}
                            >
                              {ch}
                            </span>
                          ))}
                          <span data-c="" style={{ opacity: prefersReducedMotion ? 1 : 0 }}>
                            &nbsp;
                          </span>
                        </span>
                      ))
                    )}
                  </span>
                );
              })}
            </p>
          ))}
        </div>

        <button
          ref={enterButtonRef}
          onClick={dismiss}
          className="splash-zen-anim splash-zen-cta font-brand-en"
          // E2E dismisses the splash by this testid, not by label: the copy on this button has
          // changed twice and each time it silently broke every smoke test that had to get past it.
          data-testid="splash-enter"
          aria-label="Let's begin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px 44px',
            minHeight: '48px',
            border: `1px solid ${borderColor}`,
            borderRadius: '999px',
            background: 'transparent',
            color: textPrimary,
            fontSize: '0.9375rem',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition:
              'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease, background 0.35s ease',
            // Held until the note finishes revealing. `visibility` rather than opacity alone, so
            // the hidden button is out of the tab order and the a11y tree too — it keeps its space
            // in the layout either way, so nothing shifts when it arrives.
            visibility: revealDone ? 'visible' : 'hidden',
            // Set here rather than left to the keyframe's fill-mode: the resting state should be
            // in the DOM, not implied by an animation having run. The keyframe still owns opacity
            // while it plays, and lands on the same value.
            opacity: revealDone ? 1 : 0,
            animation:
              revealDone && !prefersReducedMotion
                ? 'splashZenLift 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards, splashZenPulse 3.4s ease-in-out 1.1s infinite'
                : 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = darkMode
              ? 'rgba(197,160,89,0.07)'
              : 'rgba(197,160,89,0.09)';
            e.currentTarget.style.borderColor = 'rgba(197,160,89,0.55)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = borderColor;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span className="splash-zen-label">Let&rsquo;s Begin</span>
        </button>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
