# Audio Loading States - Implementation Guide

## Quick Reference

**Preview File:** `/Users/sfarage/Github/personal/poetry-audio-ux/audio-loading-preview.html`

Open the preview in your browser to see all three options side-by-side with interactive examples.

---

## Option 1: Pulsing Gold Ring ⭐ RECOMMENDED

### Visual Design
- Pulsing outer ring that expands and fades (breathing effect)
- Solid gold border on button
- Animated sound wave icon inside
- Bilingual labels with shimmer effect

### CSS Animations (add to app.jsx or global CSS)

```css
@keyframes pulse-ring {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.5;
  }
}

@keyframes shimmer {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.pulse-ring {
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.shimmer {
  animation: shimmer 2s ease-in-out infinite;
}
```

### JSX Implementation

Replace the existing play button section (lines ~4363-4370) with:

```jsx
<div className="flex flex-col items-center gap-1 min-w-[52px]">
  <div className="relative">
    {/* Pulsing ring (only show when generating) */}
    {isGeneratingAudio && (
      <div className="absolute inset-0 rounded-full border-2 border-[#C5A059]/40 pulse-ring" />
    )}

    {/* Main button */}
    <button
      onClick={togglePlay}
      disabled={isGeneratingAudio}
      aria-label={
        isGeneratingAudio
          ? "Preparing audio"
          : isPlaying
          ? "Pause recitation"
          : "Play recitation"
      }
      className={`
        relative min-w-[46px] min-h-[46px] p-[11px]
        ${isGeneratingAudio
          ? 'bg-transparent border-2 border-[#C5A059] cursor-wait'
          : 'bg-transparent border-none cursor-pointer hover:bg-[#C5A059]/12 hover:scale-105'
        }
        transition-all duration-300 flex items-center justify-center rounded-full
      `}
    >
      {isGeneratingAudio ? (
        <Volume2 className={`${GOLD.goldText} shimmer`} size={21} />
      ) : audioError ? (
        <Volume2 className={theme.error} size={21} />
      ) : isPlaying ? (
        <Pause fill={GOLD.gold} size={21} />
      ) : (
        <Volume2 className={GOLD.goldText} size={21} />
      )}
    </button>
  </div>

  {/* Labels */}
  {isGeneratingAudio ? (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase text-stone-400 whitespace-nowrap shimmer">
        Preparing
      </span>
      <span className="font-amiri text-[9px] text-[#C5A059]/80 shimmer" dir="rtl">
        جاري التحضير
      </span>
    </div>
  ) : (
    <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">
      Listen
    </span>
  )}
</div>
```

---

## Option 2: Sound Wave Bars

### Visual Design
- 5 vertical bars animating in wave pattern
- Staggered animation delays for fluid motion
- Subtle gold background glow
- "Crafting" label for premium feel

### CSS Animations

```css
@keyframes wave {
  0%, 100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

.wave-bar-1 {
  animation: wave 1.2s ease-in-out infinite;
  animation-delay: 0s;
}

.wave-bar-2 {
  animation: wave 1.2s ease-in-out infinite;
  animation-delay: 0.15s;
}

.wave-bar-3 {
  animation: wave 1.2s ease-in-out infinite;
  animation-delay: 0.3s;
}

.wave-bar-4 {
  animation: wave 1.2s ease-in-out infinite;
  animation-delay: 0.45s;
}

.wave-bar-5 {
  animation: wave 1.2s ease-in-out infinite;
  animation-delay: 0.6s;
}

@keyframes shimmer {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.shimmer {
  animation: shimmer 2s ease-in-out infinite;
}
```

### JSX Implementation

```jsx
<div className="flex flex-col items-center gap-1 min-w-[52px]">
  <button
    onClick={togglePlay}
    disabled={isGeneratingAudio}
    aria-label={
      isGeneratingAudio
        ? "Preparing audio"
        : isPlaying
        ? "Pause recitation"
        : "Play recitation"
    }
    className={`
      min-w-[46px] min-h-[46px] p-[11px]
      ${isGeneratingAudio
        ? 'bg-[#C5A059]/8 border border-[#C5A059]/30 cursor-wait'
        : 'bg-transparent border-none cursor-pointer hover:bg-[#C5A059]/12 hover:scale-105'
      }
      transition-all duration-300 flex items-center justify-center rounded-full
    `}
  >
    {isGeneratingAudio ? (
      <div className="flex items-center justify-center gap-0.5 h-[21px]">
        <div className="w-[2px] h-[6px] bg-[#C5A059] rounded-full wave-bar-1"></div>
        <div className="w-[2px] h-[10px] bg-[#C5A059] rounded-full wave-bar-2"></div>
        <div className="w-[2px] h-[14px] bg-[#C5A059] rounded-full wave-bar-3"></div>
        <div className="w-[2px] h-[10px] bg-[#C5A059] rounded-full wave-bar-4"></div>
        <div className="w-[2px] h-[6px] bg-[#C5A059] rounded-full wave-bar-5"></div>
      </div>
    ) : audioError ? (
      <Volume2 className={theme.error} size={21} />
    ) : isPlaying ? (
      <Pause fill={GOLD.gold} size={21} />
    ) : (
      <Volume2 className={GOLD.goldText} size={21} />
    )}
  </button>

  {/* Labels */}
  {isGeneratingAudio ? (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase text-stone-400 whitespace-nowrap shimmer">
        Crafting
      </span>
      <span className="font-amiri text-[9px] text-[#C5A059]/80 shimmer" dir="rtl">
        إعداد الصوت
      </span>
    </div>
  ) : (
    <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">
      Listen
    </span>
  )}
</div>
```

---

## Option 3: Circular Progress Arc

### Visual Design
- Rotating circular arc (progress indicator)
- Minimal, clean design
- Poetic "Weaving" metaphor
- Continuous smooth rotation

### CSS Animations

```css
@keyframes rotate {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.rotate-arc {
  animation: rotate 1.5s linear infinite;
}

@keyframes shimmer {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

.shimmer {
  animation: shimmer 2s ease-in-out infinite;
}
```

### JSX Implementation

```jsx
<div className="flex flex-col items-center gap-1 min-w-[52px]">
  <button
    onClick={togglePlay}
    disabled={isGeneratingAudio}
    aria-label={
      isGeneratingAudio
        ? "Preparing audio"
        : isPlaying
        ? "Pause recitation"
        : "Play recitation"
    }
    className={`
      relative min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none
      ${isGeneratingAudio ? 'cursor-wait' : 'cursor-pointer hover:bg-[#C5A059]/12 hover:scale-105'}
      transition-all duration-300 flex items-center justify-center rounded-full
    `}
  >
    {isGeneratingAudio && (
      <svg className="absolute inset-0 w-full h-full rotate-arc" viewBox="0 0 50 50">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#C5A059"
          strokeWidth="2"
          strokeDasharray="90 125"
          strokeLinecap="round"
        />
      </svg>
    )}

    {isGeneratingAudio ? (
      <Volume2 className={`${GOLD.goldText} relative z-10`} size={21} />
    ) : audioError ? (
      <Volume2 className={theme.error} size={21} />
    ) : isPlaying ? (
      <Pause fill={GOLD.gold} size={21} />
    ) : (
      <Volume2 className={GOLD.goldText} size={21} />
    )}
  </button>

  {/* Labels */}
  {isGeneratingAudio ? (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase text-stone-400 whitespace-nowrap shimmer">
        Weaving
      </span>
      <span className="font-amiri text-[9px] text-[#C5A059]/80 shimmer" dir="rtl">
        النسج الصوتي
      </span>
    </div>
  ) : (
    <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">
      Listen
    </span>
  )}
</div>
```

---

## Installation Steps

### 1. Add CSS Animations

Add the required CSS animations to your global styles. In `src/app.jsx`, look for the `<style>` tag in the `App` component and add the animations:

```jsx
function App() {
  return (
    <>
      <style>{`
        /* Existing styles... */

        /* Audio Loading Animations */
        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.5;
          }
        }

        @keyframes wave {
          0%, 100% {
            transform: scaleY(0.3);
          }
          50% {
            transform: scaleY(1);
          }
        }

        @keyframes rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes shimmer {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .wave-bar-1 {
          animation: wave 1.2s ease-in-out infinite;
          animation-delay: 0s;
        }

        .wave-bar-2 {
          animation: wave 1.2s ease-in-out infinite;
          animation-delay: 0.15s;
        }

        .wave-bar-3 {
          animation: wave 1.2s ease-in-out infinite;
          animation-delay: 0.3s;
        }

        .wave-bar-4 {
          animation: wave 1.2s ease-in-out infinite;
          animation-delay: 0.45s;
        }

        .wave-bar-5 {
          animation: wave 1.2s ease-in-out infinite;
          animation-delay: 0.6s;
        }

        .rotate-arc {
          animation: rotate 1.5s linear infinite;
        }

        .shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
      `}</style>

      {/* Rest of app... */}
    </>
  );
}
```

### 2. Find the Play Button Component

Search for `isGeneratingAudio` in `src/app.jsx` to find the play button section (around line 4366).

### 3. Replace with Chosen Option

Copy the JSX implementation from your chosen option above and replace the existing button code.

### 4. Test

```bash
npm run dev
```

Navigate to a poem and click the play button. The loading state should animate while audio is being generated.

---

## Accessibility Notes

All three options include:

- `aria-label` that updates based on state
- `disabled` attribute when generating
- `cursor-wait` to indicate processing
- Minimum 44x44px touch target (46px used)
- Clear visual and textual feedback

---

## Performance

All animations use CSS only (no JavaScript), ensuring:

- Smooth 60fps animation
- No impact on audio generation performance
- GPU-accelerated transforms
- Minimal CPU usage

---

## Bilingual Labels

Each option includes both English and Arabic labels:

- **Option 1:** "Preparing" / "جاري التحضير" (Currently preparing)
- **Option 2:** "Crafting" / "إعداد الصوت" (Sound preparation)
- **Option 3:** "Weaving" / "النسج الصوتي" (Sonic weaving)

All Arabic text uses `dir="rtl"` for proper right-to-left rendering.

---

## Recommendation

**Option 1 (Pulsing Gold Ring)** is recommended because:

1. ✅ Most visually striking and premium feel
2. ✅ Clear "breathing" metaphor suggests something growing/being prepared
3. ✅ Bilingual labels provide excellent context
4. ✅ Shimmer effect adds subtle sophistication
5. ✅ Gold ring matches brand aesthetic perfectly

However, all three options are production-ready and will significantly improve the user experience during audio generation.
