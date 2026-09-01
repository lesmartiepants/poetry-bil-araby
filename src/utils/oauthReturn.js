const OAUTH_QUERY_KEYS = ['code', 'error', 'error_code', 'error_description', 'state'];

export function readOAuthReturn(locationLike = window.location) {
  const params = new URLSearchParams(locationLike.search || '');
  const code = params.get('code');
  const hashParams = new URLSearchParams((locationLike.hash || '').replace(/^#/, ''));
  const error = params.get('error') || hashParams.get('error');
  const implicit = hashParams.has('access_token') || hashParams.has('error');

  if (!code && !error && !implicit) return null;
  if (error) {
    return { kind: error === 'access_denied' ? 'cancelled' : 'error' };
  }
  return { kind: 'callback' };
}

/** Remove OAuth artifacts without disturbing ordinary app query parameters. */
export function cleanOAuthReturnUrl(locationLike = window.location, historyLike = window.history) {
  const url = new URL(locationLike.href);
  OAUTH_QUERY_KEYS.forEach((key) => url.searchParams.delete(key));
  if (url.hash.includes('access_token=') || url.hash.includes('error=')) url.hash = '';
  historyLike.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}
