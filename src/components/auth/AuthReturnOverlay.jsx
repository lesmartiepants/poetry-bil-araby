import { useState } from 'react';
import { AlertCircle, Check, LoaderCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import BrandMark from '../brand/BrandMark';
import GoogleSignInButton from './GoogleSignInButton';
import { cleanOAuthReturnUrl, readOAuthReturn } from '../../utils/oauthReturn';
import {
  AUTH_BACKDROP_STYLE,
  AUTH_HAIRLINE_STYLE,
  AUTH_HEADER_STYLE,
  AUTH_PANEL_STYLE,
  AUTH_TESS_BG,
} from './authVisuals';

const STATUS_COPY = {
  loading: {
    arabic: 'نعود بك إلى القصيدة',
    title: 'Returning to Poetry Bil-Araby',
    body: 'Securing your reading library and preferences…',
    Icon: LoaderCircle,
  },
  success: {
    arabic: 'مجموعتك في انتظارك',
    title: 'You’re signed in',
    body: 'Your library is ready. Continue where you left off.',
    Icon: Check,
  },
  cancelled: {
    arabic: 'القصيدة ما زالت هنا',
    title: 'Sign-in cancelled',
    body: 'Nothing changed. You can keep reading or try Google again.',
    Icon: AlertCircle,
  },
  error: {
    arabic: 'قصيدتك في أمان',
    title: 'Sign-in could not be completed',
    body: 'Your account is safe. Please try again, or continue reading without signing in.',
    Icon: AlertCircle,
  },
};

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

  const copy = STATUS_COPY[status];

  const { Icon } = copy;
  const showActions = status !== 'loading';

  return (
    <motion.div
      className="fixed inset-0 z-[400] flex items-end sm:items-center sm:justify-center"
      style={AUTH_BACKDROP_STYLE}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.section
        role={status === 'error' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="oauth-return-title"
        aria-describedby="oauth-return-description"
        data-testid="oauth-return-panel"
        className="w-full overflow-hidden rounded-t-3xl sm:w-[min(440px,90vw)] sm:rounded-3xl"
        style={AUTH_PANEL_STYLE}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <div
          data-testid="oauth-return-header"
          className="relative h-[150px] overflow-hidden"
          style={AUTH_HEADER_STYLE}
        >
          <div
            className="absolute"
            style={{ inset: '-10px', backgroundImage: AUTH_TESS_BG }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(14,12,10,0.97))' }}
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 top-0"
            style={AUTH_HAIRLINE_STYLE}
            aria-hidden="true"
          />
          <div
            className="absolute sm:hidden"
            style={{
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '36px',
              height: '4px',
              borderRadius: '2px',
              background: 'rgba(197,160,89,0.35)',
              zIndex: 3,
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center px-6 pb-1 text-center">
            <BrandMark compact className="mb-2" />
            <p
              className="font-brand-ar text-gold"
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                textShadow: '0 2px 12px rgba(197,160,89,0.4)',
              }}
              lang="ar"
              dir="rtl"
            >
              {copy.arabic}
            </p>
            <h1
              id="oauth-return-title"
              className="mt-0.5 font-brand-en text-center italic"
              style={{
                color: 'rgba(197,160,89,0.62)',
                fontSize: '1.15rem',
                letterSpacing: '0.035em',
              }}
            >
              {copy.title}
            </h1>
          </div>
        </div>

        <div
          className="px-6 pt-5 text-center"
          style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              color: '#c5a059',
              border: '1px solid rgba(197,160,89,0.22)',
              background: 'rgba(197,160,89,0.07)',
              boxShadow: '0 0 18px rgba(197,160,89,0.1)',
            }}
          >
            <Icon
              size={24}
              className={status === 'loading' ? 'animate-spin' : ''}
              aria-hidden="true"
            />
          </div>
          <p
            id="oauth-return-description"
            className="mx-auto max-w-[330px] font-brand-en text-sm leading-relaxed"
            style={{ color: 'rgba(236,232,224,0.56)' }}
          >
            {copy.body}
          </p>

          {retryFailed && (
            <p className="mt-3 text-sm text-[#f0a7a0]" aria-live="polite">
              Google sign-in did not open. Please try again in a moment.
            </p>
          )}

          {showActions && (
            <div className="mt-5 grid gap-2">
              {status !== 'success' && (
                <GoogleSignInButton onClick={retry} loading={retrying} label="Try Google again" />
              )}
              <button
                type="button"
                onClick={dismiss}
                className={`min-h-11 rounded-xl font-brand-en text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold ${
                  status === 'success'
                    ? 'font-semibold hover:-translate-y-px active:translate-y-px'
                    : 'text-gold/70 hover:bg-white/[0.03] hover:text-gold'
                }`}
                style={
                  status === 'success'
                    ? {
                        background:
                          'linear-gradient(135deg, #9b7735, #d8bc6e 30%, #f0d98b 48%, #b8924a 72%, #d8bc6e)',
                        color: '#1a1200',
                        boxShadow: '0 4px 16px rgba(197,160,89,0.24)',
                      }
                    : undefined
                }
              >
                {status === 'success' ? 'Continue reading' : 'Continue without an account'}
              </button>
            </div>
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
