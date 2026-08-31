import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import AuthReturnOverlay from '../components/auth/AuthReturnOverlay';
import { cleanOAuthReturnUrl, readOAuthReturn } from '../utils/oauthReturn';

describe('OAuth return state', () => {
  it('recognizes a PKCE callback without exposing its code', () => {
    expect(readOAuthReturn({ search: '?code=sensitive-value', hash: '' })).toEqual({
      kind: 'callback',
    });
  });

  it('distinguishes user cancellation from an authentication error', () => {
    expect(
      readOAuthReturn({ search: '?error=access_denied&error_description=cancelled', hash: '' })
    ).toEqual({ kind: 'cancelled' });
    expect(readOAuthReturn({ search: '?error=server_error', hash: '' })?.kind).toBe('error');
  });

  it('removes OAuth values but preserves normal app parameters', () => {
    const replaceState = vi.fn();
    cleanOAuthReturnUrl(
      {
        href: 'https://example.test/poem/4?code=secret&insightsMode=inline#access_token=secret',
      },
      { replaceState }
    );
    expect(replaceState).toHaveBeenCalledWith({}, '', '/poem/4?insightsMode=inline');
  });
});

describe('AuthReturnOverlay', () => {
  it('shows a branded, non-technical cancellation state', () => {
    window.history.replaceState({}, '', '/?error=access_denied');
    render(<AuthReturnOverlay authLoading={false} user={null} onRetry={vi.fn()} />);

    expect(screen.getByLabelText('Poetry Bil-Araby')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign-in cancelled' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Google again' })).toBeInTheDocument();
  });

  it('shows progress while a callback session is being established', () => {
    window.history.replaceState({}, '', '/?code=not-rendered');
    render(<AuthReturnOverlay authLoading user={null} onRetry={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: 'Returning to Poetry Bil-Araby' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('cleans the callback URL when continuing', () => {
    window.history.replaceState({}, '', '/?error=server_error');
    render(<AuthReturnOverlay authLoading={false} user={null} onRetry={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Continue without an account' }));
    expect(window.location.search).toBe('');
  });
});
