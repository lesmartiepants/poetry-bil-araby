import { memo, useMemo } from 'react';

const MysticalConsultationEffect = memo(({ active, theme }) => {
  const particles = useMemo(() =>
    Array.from({ length: 28 }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 3 + 1}px`,
      height: `${Math.random() * 3 + 1}px`,
      opacity: Math.random() * 0.6 + 0.2,
      animationDuration: `${Math.random() * 1 + 0.5}s`,
    }))
  , []);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden animate-in fade-in duration-1000">
      <div
        className={`absolute inset-0 bg-radial-gradient ${theme.glow} animate-pulse scale-125 opacity-80`}
      />
      <div
        className={`absolute inset-0 bg-radial-gradient from-lapis/20 to-transparent animate-ping scale-150 opacity-30`}
        style={{ animationDuration: '3s' }}
      />
      <div
        className="absolute inset-0"
        style={{ willChange: 'transform, opacity' }}
      >
        {particles.map((p, i) => (
          <div
            key={i}
            className="absolute bg-lapis-light rounded-full animate-pulse"
            style={{
              width: p.width,
              height: p.height,
              top: p.top,
              left: p.left,
              opacity: p.opacity,
              animationDuration: p.animationDuration,
            }}
          />
        ))}
      </div>
    </div>
  );
});

// Only re-render when active or theme changes — not on parent streaming state
export default MysticalConsultationEffect;
