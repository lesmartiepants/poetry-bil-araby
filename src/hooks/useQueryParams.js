import { useState, useCallback } from 'react';

/**
 * Custom hook for reading and writing URL query parameters.
 *
 * Uses window.history.replaceState directly rather than wouter's navigate(),
 * because wouter's useLocation() tracks only the pathname — passing
 * '/path?foo=bar' to navigate() treats '?foo=bar' as part of the pathname
 * and does not update window.location.search reliably.
 *
 * A local state counter drives re-renders when setParams is called, since
 * window.location.search is not reactive.
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
  // Incrementing this triggers a re-render so `params` is recomputed from
  // the updated window.location.search after a replaceState call.
  const [, forceUpdate] = useState(0);

  const params = Object.fromEntries(new URLSearchParams(window.location.search));

  const setParams = useCallback((updates) => {
    const next = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([k, v]) =>
      v == null ? next.delete(k) : next.set(k, String(v))
    );
    const qs = next.toString();
    const newUrl = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
    forceUpdate((n) => n + 1);
  }, []);

  return [params, setParams];
}
