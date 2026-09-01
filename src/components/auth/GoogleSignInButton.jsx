import { LoaderCircle } from 'lucide-react';
import GoogleMark from './GoogleMark';

/**
 * Google owns the inner provider button; Poetry owns the decorative surround.
 * The inner colors and boundary match Google's documented dark theme exactly.
 */
export default function GoogleSignInButton({
  onClick,
  loading = false,
  label = 'Continue with Google',
  loadingLabel = 'Opening Google…',
}) {
  return (
    <div
      data-testid="poetry-google-frame"
      className="w-full rounded-[14px] p-px transition-all duration-200 hover:-translate-y-px hover:scale-[1.006]"
      style={{
        background:
          'linear-gradient(135deg, #9b7735, #d8bc6e 24%, #f0d98b 42%, #b8924a 63%, #e0c97a 82%, #9b7735)',
        boxShadow: '0 0 0 1px rgba(197,160,89,0.1), 0 5px 18px rgba(197,160,89,0.24)',
      }}
    >
      <button
        onClick={onClick}
        type="button"
        disabled={loading}
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-[12px] border border-[#8e918f] bg-[#131314] px-4 text-sm font-medium text-[#e3e3e3] transition-colors duration-200 hover:bg-[#1f1f20] active:bg-[#252526] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ab4f8] disabled:cursor-wait disabled:opacity-75"
        style={{
          fontFamily: 'Google Sans, Roboto, system-ui, -apple-system, sans-serif',
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: '1.25rem',
        }}
      >
        {loading ? (
          <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
        ) : (
          <GoogleMark />
        )}
        {loading ? loadingLabel : label}
      </button>
    </div>
  );
}
