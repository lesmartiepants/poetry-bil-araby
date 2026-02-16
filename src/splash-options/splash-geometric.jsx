import React from 'react';
import { Moon, Sun } from 'lucide-react';

export const SplashGeometric = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const isDark = darkMode !== false;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${
        isDark ? 'bg-[#0c0c0e] text-stone-100' : 'bg-[#FDFCF8] text-stone-900'
      }`}
    >
      <style>{`
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.55; }
        }
        @keyframes morph {
          0%, 100% { border-radius: 20%; }
          50% { border-radius: 50%; }
        }
      `}</style>

      <button
        onClick={onToggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="absolute right-6 top-6 rounded-full border border-indigo-500/30 bg-indigo-500/10 p-3 text-indigo-300 transition hover:scale-105"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 400 400" className="h-[70vmin] w-[70vmin] text-indigo-500/30">
          <circle
            cx="200"
            cy="200"
            r="145"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ animation: 'rotate 18s linear infinite' }}
          />
          <rect
            x="95"
            y="95"
            width="210"
            height="210"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ animation: 'morph 7s ease-in-out infinite, pulse 5s ease-in-out infinite' }}
          />
          <polygon
            points="200,70 325,165 275,325 125,325 75,165"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            style={{ animation: 'rotate 24s linear infinite reverse' }}
          />
        </svg>
      </div>

      <div className="relative z-10 mx-6 max-w-2xl rounded-2xl border border-stone-500/20 bg-black/20 p-8 text-center backdrop-blur-md">
        <p className="font-amiri text-4xl text-[#C5A059]">بالعربي</p>
        <p className="font-brand-en text-5xl lowercase tracking-tight">poetry</p>

        <div className="mt-5 space-y-1 text-sm uppercase tracking-[0.2em] text-indigo-200/80">
          <p>
            <span>Where</span> <span>Mathematics</span> <span>Meets</span> <span>Poetry</span>
          </p>
        </div>

        <button
          onClick={onGetStarted}
          className="mt-8 rounded-xl border border-indigo-400/40 bg-indigo-500/20 px-6 py-3 font-semibold tracking-wide text-indigo-100 transition hover:scale-[1.02] hover:bg-indigo-500/30"
        >
          Enter the Form
          <span className="ml-3 font-amiri text-sm opacity-80">ادخل الشكل</span>
        </button>
      </div>
    </div>
  );
};

export const WalkthroughGeometric = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 text-white">
      <div className="w-full max-w-md rounded-xl border border-indigo-400/30 bg-stone-900/90 p-6 text-center">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-indigo-300">Geometric Walkthrough</p>
        <h2 className="text-xl font-semibold">Explore the structure of verse</h2>
        <button
          onClick={onClose}
          className="mt-6 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
