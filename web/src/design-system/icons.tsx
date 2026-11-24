// Line icons used across the app (24px grid, 1.6 stroke), plus the brand mark.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22): SVGProps<SVGSVGElement> => ({
  width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
});

export const Back = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M15 6l-6 6 6 6" /></svg>;
export const Chevron = ({ size = 16, ...p }: P) => <svg {...base(size)} {...p}><path d="M9 6l6 6-6 6" /></svg>;
export const Close = ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Check = ({ size = 18, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 12l5 5 9-10" /></svg>;
export const Compass = ({ size = 21, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></svg>;
export const Bookmark = ({ size = 21, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 3h12v18l-6-4-6 4z" /></svg>;
export const Person = ({ size = 21, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
export const Search = ({ size = 20, ...p }: P) => <svg {...base(size)} {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const Heart = ({ size = 20, filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base(size)} {...p} fill={filled ? 'currentColor' : 'none'}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
);
export const Share = ({ size = 20, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 3v12M7 8l5-5 5 5M5 14v5h14v-5" /></svg>;
export const Play = ({ size = 18, ...p }: P) => <svg {...base(size)} {...p} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z" /></svg>;
export const Pause = ({ size = 20, ...p }: P) => <svg {...base(size)} {...p} fill="currentColor" stroke="none"><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg>;
export const Headphones = ({ size = 20, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 15v-3a8 8 0 0 1 16 0v3" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></svg>;
export const Lamp = ({ size = 20, ...p }: P) => <svg {...base(size)} {...p}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z" /></svg>;
export const Dots = ({ size = 20, ...p }: P) => <svg {...base(size)} {...p} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>;
export const Lock = ({ size = 16, ...p }: P) => <svg {...base(size)} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;
export const Clock = ({ size = 16, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>;
export const Up = ({ size = 20, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 14l6-6 6 6" /></svg>;
export const Copy = ({ size = 18, ...p }: P) => <svg {...base(size)} {...p}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></svg>;
export const Link = ({ size = 18, ...p }: P) => <svg {...base(size)} {...p}><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" /></svg>;
export const Bug = ({ size = 16, ...p }: P) => <svg {...base(size)} {...p}><rect x="8" y="7" width="8" height="12" rx="4" /><path d="M12 7V4M4 13h4M16 13h4M5 8l3 2M19 8l-3 2M5 19l3-2M19 19l-3-2" /></svg>;

/** The eight-point brand mark (khatam), drawn as nested squares. */
export function Mark({ size = 28, colour = 'currentColor', weight = 1 }: { size?: number; colour?: string; weight?: number }) {
  const w = (n: number) => n * weight;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <g fill="none" stroke={colour}>
        <path d="M21.82 21.82 L98.18 21.82 L98.18 98.18 L21.82 98.18 Z" strokeWidth={w(2)} />
        <path d="M60 6 L114 60 L60 114 L6 60 Z" strokeWidth={w(2)} />
        <path d="M43.93 21.2 L98.8 43.93 L76.07 98.8 L21.2 76.07 Z" strokeWidth={w(2.6)} />
        <path d="M76.07 21.2 L98.8 76.07 L43.93 98.8 L21.2 43.93 Z" strokeWidth={w(2.6)} />
        <path d="M38.79 38.79 L81.21 38.79 L81.21 81.21 L38.79 81.21 Z" strokeWidth={w(3.2)} />
        <path d="M60 30 L90 60 L60 90 L30 60 Z" strokeWidth={w(3.2)} />
        <path d="M53.11 43.37 L76.63 53.11 L66.89 76.63 L43.37 66.89 Z" strokeWidth={w(3.8)} />
        <path d="M66.89 43.37 L76.63 66.89 L53.11 76.63 L43.37 53.11 Z" strokeWidth={w(3.8)} />
      </g>
      <circle cx="60" cy="60" r="5" fill={colour} />
    </svg>
  );
}
