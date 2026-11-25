import { Link, useLocation } from 'wouter';
import { Bookmark, Compass, Mark, Person } from '@ds/icons';
import { useLongPress } from './useLongPress';
import { DEV_PANEL_ENABLED } from '@components/devlog';
import { useDevPanel } from '../features/shell/devPanelState';

const TABS = [
  { href: '/journey', label: 'Journey', match: ['/journey', '/welcome'], icon: (on: boolean) => <Mark size={22} colour={on ? '#17140D' : 'currentColor'} weight={1.1} /> },
  { href: '/explore', label: 'Explore', match: ['/explore', '/poet', '/collection', '/search'], icon: () => <Compass /> },
  { href: '/library', label: 'Library', match: ['/library'], icon: () => <Bookmark /> },
  { href: '/you', label: 'You', match: ['/you'], icon: () => <Person /> },
];

export function TabBar({ readerVisible }: { readerVisible?: boolean } = {}) {
  const inReader = readerVisible !== undefined;
  const classes = ['tabbar', inReader && 'tabbar--reader', readerVisible && 'tabbar--reader-visible'];
  const inert = readerVisible === false ? { inert: '' } : {};
  const [loc] = useLocation();
  const toggle = useDevPanel((s) => s.toggleTab);
  const press = useLongPress(toggle, 800);
  return (
    <nav aria-label="Main" aria-hidden={readerVisible === false || undefined} className={classes.filter(Boolean).join(' ')} {...inert} {...(DEV_PANEL_ENABLED ? press : undefined)} data-testid="tabbar">
      {TABS.map((t) => {
        const on = inReader
          ? t.href === '/explore'
          : t.match.some((m) => loc === m || loc.startsWith(`${m}/`));
        const current = on ? (inReader ? 'location' : 'page') : undefined;
        return (
          <Link key={t.href} href={t.href} className="tabbar__tab" aria-label={t.label} aria-current={current}
            onClick={inReader ? () => requestAnimationFrame(() => window.scrollTo(0, 0)) : undefined}>
            {t.icon(on)}{on && t.label.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
