import { useMemo } from 'react';
import { useLocation } from 'wouter';

/**
 * Custom hook for reading and writing URL query parameters.
 * Built on top of wouter's useLocation — no additional dependencies.
 *
 * Note: wouter's useLocation() returns only the pathname (no query string),
 * so we read params from window.location.search directly.
 *
 * @returns {[Object, Function]} [params, setParams]
 *   - params: plain object of current query parameter key-value pairs
 *   - setParams: function to merge updates into query params (set value to null to delete a param)
 *
 * URL scheme examples:
 *   /?poet=Nizar+Qabbani
 *   /poem/123?poet=Nizar+Qabbani
 */
export function useQueryParams() {
  const [location, navigate] = useLocation();

  const params = useMemo(() => {
    const search = window.location.search;
    return Object.fromEntries(new URLSearchParams(search));
  }, [location]); // re-parse when wouter detects navigation

  const setParams = (updates) => {
    const next = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([k, v]) =>
      v == null ? next.delete(k) : next.set(k, String(v))
    );
    const qs = next.toString();
    const base = window.location.pathname;
    navigate(qs ? `${base}?${qs}` : base, { replace: true });
  };

  return [params, setParams];
}
