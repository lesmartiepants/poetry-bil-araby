import { Link, useLocation, useSearch } from 'wouter';
import { Bookmark, Compass, Mark, Person } from '@ds/icons';
import { useDevTabHold } from '../features/shell/useDevTabHold';

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
  // Search opened from the Library keeps the Library tab lit (11.1); from Explore it is Explore's.
  const query = useSearch();
  const fromLibrary = loc === '/search' && new URLSearchParams(query).get('from') === 'library';
  const press = useDevTabHold().handlers;
  return (
    <nav aria-label="Main" aria-hidden={readerVisible === false || undefined} className={classes.filter(Boolean).join(' ')} {...inert} {...press} data-testid="tabbar">
      {TABS.map((t) => {
        const on = inReader
          ? t.href === '/explore'
          : fromLibrary
            ? t.href === '/library'
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
