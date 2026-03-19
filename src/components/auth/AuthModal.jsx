import { X, Feather } from 'lucide-react';
import { motion } from 'framer-motion';

const AuthModal = ({ isOpen, onClose, onSignInWithGoogle, theme, message }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(197,160,89,0.08) 0%, rgba(0,0,0,0.7) 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          background: 'linear-gradient(145deg, rgba(20,18,15,0.97) 0%, rgba(12,12,14,0.98) 100%)',
          border: '1px solid rgba(197,160,89,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold accent line */}
        <div
          style={{
            height: '2px',
            background:
              'linear-gradient(90deg, transparent, rgba(197,160,89,0.6), rgba(212,180,120,0.8), rgba(197,160,89,0.6), transparent)',
          }}
        />

        <div className="px-8 pt-8 pb-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={18} style={{ color: 'rgba(197,160,89,0.6)' }} />
          </button>

          {/* Greeting */}
          <div className="text-center mb-6">
            <h2 className="font-amiri text-3xl mb-2" style={{ color: '#C5A059' }}>
              مرحباً
            </h2>
            <p className="font-brand-en text-sm text-stone-400 leading-relaxed">
              {message || 'Sign in to save poems and preferences'}
            </p>
          </div>

          {/* Decorative divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#C5A059]/30" />
            <Feather size={12} style={{ color: 'rgba(197,160,89,0.4)' }} />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#C5A059]/30" />
          </div>

          {/* Google sign-in button */}
          <button
            onClick={onSignInWithGoogle}
            className="w-full py-3.5 px-5 rounded-xl transition-all duration-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background:
                'linear-gradient(135deg, rgba(197,160,89,0.12) 0%, rgba(197,160,89,0.06) 100%)',
              border: '1px solid rgba(197,160,89,0.3)',
              color: '#D4C8B0',
              fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
              fontSize: '14px',
              fontWeight: 500,
              letterSpacing: '0.01em',
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
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

          <p
            className="mt-5 text-center text-[10px] text-stone-600"
            style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
          >
            By signing in, you agree to our Terms of Service
          </p>
        </div>

        {/* Gold accent bottom */}
        <div
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(197,160,89,0.3), transparent)',
          }}
        />
      </motion.div>
    </motion.div>
  );
};

export default AuthModal;
