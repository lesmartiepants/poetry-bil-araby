import { useState } from 'react';
import { AlertCircle, Check, LoaderCircle } from 'lucide-react';
import BrandMark from '../brand/BrandMark';
import GoogleSignInButton from './GoogleSignInButton';
import { cleanOAuthReturnUrl, readOAuthReturn } from '../../utils/oauthReturn';

export default function AuthReturnOverlay({ authLoading, user, onRetry }) {
  const [oauthReturn] = useState(() => readOAuthReturn());
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);

  if (!oauthReturn || dismissed) return null;

  let status = oauthReturn.kind;
  if (status === 'callback') {
    if (authLoading) status = 'loading';
    else status = user ? 'success' : 'error';
  }

  const dismiss = () => {
    cleanOAuthReturnUrl();
    setDismissed(true);
  };

  const retry = async () => {
    setRetrying(true);
    setRetryFailed(false);
    cleanOAuthReturnUrl();
    try {
      const result = await onRetry();
      if (result?.error) {
        setRetryFailed(true);
        setRetrying(false);
      }
    } catch {
      setRetryFailed(true);
      setRetrying(false);
    }
  };

  const copy = {
    loading: {
      title: 'Returning to Poetry Bil-Araby',
      body: 'Securing your reading library and preferences…',
      Icon: LoaderCircle,
    },
    success: {
      title: 'You’re signed in',
      body: 'Your library is ready. Continue where you left off.',
      Icon: Check,
    },
    cancelled: {
      title: 'Sign-in cancelled',
      body: 'Nothing changed. You can keep reading or try Google again.',
      Icon: AlertCircle,
    },
    error: {
      title: 'Sign-in could not be completed',
      body: 'Your account is safe. Please try again, or continue reading without signing in.',
      Icon: AlertCircle,
    },
  }[status];

  const { Icon } = copy;
  const showActions = status !== 'loading';

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
      <section
        role={status === 'error' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="oauth-return-title"
        aria-describedby="oauth-return-description"
        className="w-full max-w-[420px] rounded-3xl border border-gold/20 bg-[#0c0c0e] px-6 py-8 text-center shadow-2xl"
      >
        <BrandMark className="mb-6" />
        <Icon
          size={28}
          className={`mx-auto mb-3 text-gold ${status === 'loading' ? 'animate-spin' : ''}`}
          aria-hidden="true"
        />
        <h1 id="oauth-return-title" className="font-brand-en text-xl text-stone-100">
          {copy.title}
        </h1>
        <p
          id="oauth-return-description"
          className="mt-2 font-brand-en text-sm leading-relaxed text-stone-400"
        >
          {copy.body}
        </p>

        {retryFailed && (
          <p className="mt-3 text-sm text-[#f0a7a0]" aria-live="polite">
            Google sign-in did not open. Please try again in a moment.
          </p>
        )}

        {showActions && (
          <div className="mt-6 grid gap-2">
            {status !== 'success' && (
              <GoogleSignInButton onClick={retry} loading={retrying} label="Try Google again" />
            )}
            <button
              type="button"
              onClick={dismiss}
              className="min-h-11 rounded-lg font-brand-en text-sm text-gold/70 hover:bg-white/[0.03] hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              {status === 'success' ? 'Continue reading' : 'Continue without an account'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
