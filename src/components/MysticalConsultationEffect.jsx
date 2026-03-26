const MysticalConsultationEffect = ({ active, theme }) => {
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
      <div className="absolute inset-0">
        {[...Array(45)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-lapis-light rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.2,
              animationDuration: Math.random() * 1 + 0.5 + 's',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default MysticalConsultationEffect;
