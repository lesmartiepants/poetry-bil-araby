import { Mark } from '@ds/icons';
import './shell.css';

/** 1.1 Splash: the mark while the app opens. */
export function Splash() {
  return (
    <div className="splash" role="img" aria-label="Poetry in Arabic">
      <Mark size={96} colour="var(--c-accent)" weight={0.7} />
      <div className="stack" style={{ alignItems: 'center' }}>
        <span lang="ar" className="splash__ar">شعر بالعربي</span>
        <span className="splash__en">poetry in Arabic</span>
      </div>
      <div className="splash__foot">
        <p lang="ar" className="ar" style={{ margin: 0, fontSize: 17, color: 'var(--c-text-3)' }}>الشعر العربي، مقروءًا ومسموعًا</p>
        <p style={{ margin: 0, fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 17, color: 'var(--c-muted)' }}>Arabic poetry, read and heard.</p>
      </div>
    </div>
  );
}
