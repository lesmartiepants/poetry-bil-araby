import { LoaderCircle, X } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useModalStore } from '../../stores/modalStore';
import BrandMark from '../brand/BrandMark';
import GoogleMark from './GoogleMark';

const TESS_BG = [
  'repeating-linear-gradient(45deg, rgba(197,160,89,0.18) 0px, rgba(197,160,89,0.18) 1px, transparent 1px, transparent 22px)',
  'repeating-linear-gradient(-45deg, rgba(197,160,89,0.18) 0px, rgba(197,160,89,0.18) 1px, transparent 1px, transparent 22px)',
  'repeating-linear-gradient(0deg, rgba(197,160,89,0.09) 0px, rgba(197,160,89,0.09) 1px, transparent 1px, transparent 22px)',
  'repeating-linear-gradient(90deg, rgba(197,160,89,0.09) 0px, rgba(197,160,89,0.09) 1px, transparent 1px, transparent 22px)',
  'repeating-linear-gradient(22.5deg, rgba(197,160,89,0.07) 0px, rgba(197,160,89,0.07) 1px, transparent 1px, transparent 44px)',
  'repeating-linear-gradient(-22.5deg, rgba(197,160,89,0.07) 0px, rgba(197,160,89,0.07) 1px, transparent 1px, transparent 44px)',
].join(', ');

const FEATURES = [
  { icon: '🔖', label: 'Save favourite verses' },
  { icon: '✨', label: 'Personalized recommendations by mood, topic & era' },
  { icon: '🗂️', label: 'Browse your curated library' },
];

const AuthModal = ({ onSignInWithGoogle }) => {
  const isOpen = useModalStore((s) => s.authModal);
  const onClose = () => useModalStore.getState().closeAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [signInError, setSignInError] = useState('');

  const handleGoogleSignIn = async () => {
    if (isRedirecting) return;
    setSignInError('');
    setIsRedirecting(true);
    try {
      const result = await onSignInWithGoogle();
      if (result?.error) {
        setSignInError('We could not open Google sign-in. Please try again.');
        setIsRedirecting(false);
      }
    } catch {
      setSignInError('We could not open Google sign-in. Please try again.');
      setIsRedirecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    /* Backdrop — also acts as flex positioner:
       mobile  → items-end  (sheet anchored to bottom)
       desktop → items-center justify-center (centered modal) */
    <motion.div
      className="fixed inset-0 z-[300] flex items-end sm:items-center sm:justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      {/* Sheet / Modal */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        aria-describedby="auth-dialog-description"
        data-tour-anchor="auth"
        className="w-full overflow-hidden rounded-t-3xl sm:w-[min(480px,90vw)] sm:max-h-[85vh] sm:overflow-y-auto sm:rounded-3xl"
        style={{
          background: 'linear-gradient(180deg, rgba(14,12,10,0.98), rgba(10,10,14,0.99))',
          boxShadow:
            '0 0 0 1px rgba(197,160,89,0.15), 0 32px 80px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.5)',
        }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Tessellated header ── */}
        <div
          className="relative overflow-hidden"
          style={{
            height: '130px',
            background: 'linear-gradient(180deg, rgba(20,16,10,0.98), rgba(14,12,10,0.97))',
          }}
        >
          {/* tessellation pattern */}
          <div
            className="absolute"
            style={{ inset: '-10px', backgroundImage: TESS_BG }}
            aria-hidden="true"
          />
          {/* vignette fade */}
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
            style={{
              height: '40px',
              background: 'linear-gradient(to bottom, transparent, rgba(14,12,10,0.97))',
            }}
            aria-hidden="true"
          />
          {/* gold hairline */}
          <div
            className="absolute top-0 left-0 right-0"
            style={{
              height: '2px',
              zIndex: 2,
              background:
                'linear-gradient(90deg, transparent, rgba(160,128,64,0.4) 20%, #c5a059 50%, rgba(160,128,64,0.4) 80%, transparent)',
            }}
          />

          {/* drag handle — mobile only */}
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

          {/* close button */}
          <button
            className="absolute top-3 right-3.5 z-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105 active:scale-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            style={{
              width: '36px',
              height: '36px',
              border: '1px solid rgba(197,160,89,0.18)',
              background: 'rgba(197,160,89,0.06)',
              color: 'rgba(197,160,89,0.5)',
            }}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={13} />
          </button>

          {/* title stack */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center pb-1"
            style={{ zIndex: 2 }}
          >
            <BrandMark compact className="mb-2" />
            <p
              id="auth-dialog-title"
              className="font-brand-ar text-gold text-center"
              style={{
                fontSize: '1.65rem',
                fontWeight: 600,
                letterSpacing: '0.02em',
                textShadow: '0 2px 12px rgba(197,160,89,0.4)',
              }}
              lang="ar"
              dir="rtl"
            >
              مجموعة مختارة في انتظارك
            </p>
            <p
              className="font-brand-en italic text-center mt-0.5"
              style={{
                fontSize: '1.65rem',
                color: 'rgba(197,160,89,0.6)',
                letterSpacing: '0.04em',
                padding: '0 12px',
              }}
            >
              A Curated Collection Awaits
            </p>
          </div>
        </div>

        {/* ── Sheet body ── */}
        <div
          className="px-6 pt-5"
          style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
        >
          <p
            id="auth-dialog-description"
            className="mb-4 text-center font-brand-en"
            style={{ color: 'rgba(236,232,224,0.56)', fontSize: '0.82rem', lineHeight: 1.5 }}
          >
            Sign in to keep your poetry library and reading preferences with you.
          </p>

          {/* Feature trio */}
          <div className="flex gap-3 mb-5" aria-label="What you unlock">
            {FEATURES.map(({ icon, label }) => (
              <div
                key={label}
                className="flex-1 rounded-xl p-3 text-center"
                style={{
                  background: 'rgba(197,160,89,0.05)',
                  border: '1px solid rgba(197,160,89,0.12)',
                }}
              >
                <span
                  className="block text-lg mb-1.5"
                  aria-hidden="true"
                  style={{ filter: 'sepia(1) saturate(2) hue-rotate(10deg)' }}
                >
                  {icon}
                </span>
                <p
                  className="leading-[1.35] tracking-wide"
                  style={{
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '0.68rem',
                    color: 'rgba(236,232,224,0.50)',
                  }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Google CTA */}
          <button
            onClick={handleGoogleSignIn}
            type="button"
            disabled={isRedirecting}
            className="relative w-full flex items-center justify-center gap-3 overflow-hidden rounded-md transition-all duration-200 hover:bg-[#f8faff] active:bg-[#eef2f7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285f4] disabled:cursor-wait disabled:opacity-75"
            style={{
              minHeight: '48px',
              padding: '0 16px',
              background: '#fff',
              border: '1px solid #747775',
              color: '#1f1f1f',
              fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
              fontSize: '0.875rem',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            {isRedirecting ? (
              <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <GoogleMark />
            )}
            {isRedirecting ? 'Opening Google…' : 'Continue with Google'}
          </button>

          <div aria-live="polite" className="min-h-[1.4rem] pt-2 text-center">
            {signInError && <p className="text-sm text-[#f0a7a0]">{signInError}</p>}
          </div>

          <p
            className="text-center font-brand-en"
            style={{ color: 'rgba(236,232,224,0.42)', fontSize: '0.7rem', lineHeight: 1.55 }}
          >
            Google shares your name, email address, and profile image. We use them only to create
            and secure your Poetry Bil-Araby account.
          </p>

          <nav
            aria-label="Account information"
            className="mt-2 flex items-center justify-center gap-3 font-brand-en"
            style={{ fontSize: '0.7rem', color: 'rgba(197,160,89,0.6)' }}
          >
            <a className="hover:text-gold focus-visible:outline" href="/privacy.html">
              Privacy
            </a>
            <span aria-hidden="true">·</span>
            <a className="hover:text-gold focus-visible:outline" href="/terms.html">
              Terms
            </a>
            <span aria-hidden="true">·</span>
            <a
              className="hover:text-gold focus-visible:outline"
              href="https://github.com/lesmartiepants/poetry-bil-araby/issues"
              target="_blank"
              rel="noreferrer"
            >
              Support
            </a>
          </nav>

          {/* Dismiss */}
          <button
            type="button"
            className="block w-full mt-2.5 rounded-lg font-brand-en italic text-center transition-all duration-200 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/40"
            style={{
              minHeight: '44px',
              padding: '10px 8px',
              border: 'none',
              background: 'transparent',
              color: 'rgba(236,232,224,0.28)',
              fontSize: '0.83rem',
              letterSpacing: '0.03em',
            }}
            onClick={onClose}
          >
            Continue reading without an account
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AuthModal;
