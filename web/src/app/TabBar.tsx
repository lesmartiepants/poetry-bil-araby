import { Link, useLocation } from 'wouter';
import { Bookmark, Compass, Mark, Person } from '@ds/icons';
import { useLongPress } from './useLongPress';
import { DEV_PANEL_ENABLED, useDevPanel } from '../features/shell/devPanelState';

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
  const press = useLongPress(() => DEV_PANEL_ENABLED && toggle());
  return (
    <nav aria-label="Main" aria-hidden={readerVisible === false || undefined} className={classes.filter(Boolean).join(' ')} {...inert} {...press} data-testid="tabbar">
      {TABS.map((t) => {
        const on = t.match.some((m) => loc === m || loc.startsWith(`${m}/`));
        const home = inReader && t.href === '/journey';
        const label = home ? 'Home' : t.label;
        return (
          <Link key={t.href} href={home ? '/' : t.href} className="tabbar__tab" aria-label={label} aria-current={on ? 'page' : undefined}
            onClick={inReader ? () => requestAnimationFrame(() => window.scrollTo(0, 0)) : undefined}>
            {t.icon(on)}{inReader ? label : on && label.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
