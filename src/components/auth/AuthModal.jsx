import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useModalStore } from '../../stores/modalStore';

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

  if (!isOpen) return null;

  return (
    /* Backdrop — also acts as flex positioner:
       mobile  → items-end  (sheet anchored to bottom)
       desktop → items-center justify-center (centered modal) */
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
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
        aria-label="Sign in to Dīwān"
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
            <p
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
              اكتشف رحلتك في الشعر
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
              Unlock your Journey Through Poetry
            </p>
          </div>
        </div>

        {/* ── Sheet body ── */}
        <div
          className="px-6 pt-5"
          style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
        >
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
            onClick={onSignInWithGoogle}
            type="button"
            className="relative w-full flex items-center justify-center gap-3 overflow-hidden rounded-[14px] transition-all duration-200 hover:-translate-y-px hover:scale-[1.01] active:scale-[0.967] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-bright"
            style={{
              minHeight: '54px',
              padding: '0 20px',
              background:
                'linear-gradient(135deg, #a8853d, #c5a059 22%, #e0c97a 38%, #d4b463 48%, #b8924a 62%, #d8bc6e 78%, #c5a059)',
              color: '#1a1200',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '0.92rem',
              fontWeight: 700,
              letterSpacing: '0.02em',
              boxShadow:
                '0 1px 0 rgba(255,255,255,0.42) inset, 0 -1px 0 rgba(0,0,0,0.24) inset, 0 4px 16px rgba(197,160,89,0.32), 0 1px 4px rgba(197,160,89,0.18)',
            }}
          >
            {/* convex dome highlight */}
            <span
              className="absolute top-0 left-0 right-0 pointer-events-none"
              style={{
                height: '50%',
                borderRadius: '14px 14px 60% 60% / 14px 14px 50% 50%',
                background:
                  'linear-gradient(to bottom, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.06) 60%, transparent 100%)',
              }}
              aria-hidden="true"
            />
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

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
