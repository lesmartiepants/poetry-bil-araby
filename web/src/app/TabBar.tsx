import { Link, useLocation } from 'wouter';
import { Bookmark, Compass, Mark, Person } from '@ds/icons';
import { useDevTabHold } from '../features/shell/useDevTabHold';

const TABS = [
  { href: '/journey', label: 'Journey', match: ['/journey', '/welcome'], icon: (on: boolean) => <Mark size={22} colour={on ? '#17140D' : 'currentColor'} weight={1.1} /> },
  { href: '/explore', label: 'Explore', match: ['/explore', '/poet', '/collection', '/search'], icon: () => <Compass /> },
  { href: '/library', label: 'Library', match: ['/library'], icon: () => <Bookmark /> },
  { href: '/you', label: 'You', match: ['/you'], icon: () => <Person /> },
];

export function TabBar() {
  const [loc] = useLocation();
  const press = useDevTabHold().handlers;
  return (
    <nav aria-label="Main" className="tabbar" {...press} data-testid="tabbar">
      {TABS.map((t) => {
        const on = t.match.some((m) => loc === m || loc.startsWith(`${m}/`));
        return (
          <Link key={t.href} href={t.href} className="tabbar__tab" aria-label={t.label} aria-current={on ? 'page' : undefined}>
            {t.icon(on)}{on && t.label.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
