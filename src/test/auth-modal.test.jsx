import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ─── Mock framer-motion — forward all props so aria/role attrs reach the DOM ───
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      onClick,
      role,
      'aria-modal': ariaModal,
      'aria-label': ariaLabel,
      'data-tour-anchor': dataTourAnchor,
      ...rest
    }) => (
      <div
        className={className}
        style={style}
        onClick={onClick}
        role={role}
        aria-modal={ariaModal}
        aria-label={ariaLabel}
        data-tour-anchor={dataTourAnchor}
        {...rest}
      >
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }) => children,
}));

// ─── Controllable modalStore mock ────────────────────────────────────────────
const mockCloseAuth = vi.fn();
let mockIsOpen = false;

vi.mock('../stores/modalStore', () => ({
  useModalStore: Object.assign(
    vi.fn((selector) =>
      selector({
        authModal: mockIsOpen,
        closeAuth: mockCloseAuth,
      })
    ),
    {
      getState: () => ({ closeAuth: mockCloseAuth }),
    }
  ),
}));

// Must import AFTER mocks are registered
const { default: AuthModal } = await import('../components/auth/AuthModal.jsx');

describe('AuthModal', () => {
  const onSignInWithGoogle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to closed state
    mockIsOpen = false;
  });

  // ── Closed state ─────────────────────────────────────────────────────────

  it('renders nothing when authModal is false', () => {
    mockIsOpen = false;
    const { container } = render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
    expect(container.firstChild).toBeNull();
  });

  // ── Open state ───────────────────────────────────────────────────────────

  describe('when open', () => {
    beforeEach(() => {
      mockIsOpen = true;
    });

    it('renders a dialog with correct aria attributes', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'auth-dialog-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'auth-dialog-description');
    });

    it('renders the Arabic header title', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      expect(screen.getByText('مجموعة مختارة في انتظارك')).toBeInTheDocument();
    });

    it('renders the English subtitle', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      expect(screen.getByText('A Curated Collection Awaits')).toBeInTheDocument();
    });

    it('renders all three feature items', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      expect(screen.getByText('Save favourite verses')).toBeInTheDocument();
      expect(
        screen.getByText('Personalized recommendations by mood, topic & era')
      ).toBeInTheDocument();
      expect(screen.getByText('Browse your curated library')).toBeInTheDocument();
    });

    it('renders the Google sign-in CTA', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
      expect(screen.getByTestId('poetry-google-frame')).toHaveClass('p-px');
      expect(screen.getByRole('button', { name: /continue with google/i })).toHaveClass(
        'bg-[#131314]',
        'text-[#e3e3e3]',
        'border-[#8e918f]'
      );
    });

    it('identifies the app and explains the profile information used', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      expect(screen.getByLabelText('Poetry Bil-Araby')).toBeInTheDocument();
      expect(screen.getByText(/Google shares your name, email address/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
        'href',
        '/privacy.html'
      );
      expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms.html');
    });

    it('calls onSignInWithGoogle when the Google button is clicked', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
      expect(onSignInWithGoogle).toHaveBeenCalledOnce();
    });

    it('renders the close (X) button', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('closes the modal when the X button is clicked', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(mockCloseAuth).toHaveBeenCalledOnce();
    });

    it('renders the dismiss / continue-without-account link', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      expect(
        screen.getByRole('button', { name: /continue reading without an account/i })
      ).toBeInTheDocument();
    });

    it('closes the modal when the dismiss button is clicked', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      fireEvent.click(screen.getByRole('button', { name: /continue reading without an account/i }));
      expect(mockCloseAuth).toHaveBeenCalledOnce();
    });

    it('closes the modal when the backdrop is clicked', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop);
      expect(mockCloseAuth).toHaveBeenCalled();
    });

    it('Arabic title has dir="rtl" attribute', () => {
      render(<AuthModal onSignInWithGoogle={onSignInWithGoogle} />);
      const arabicTitle = screen.getByText('مجموعة مختارة في انتظارك');
      expect(arabicTitle).toHaveAttribute('dir', 'rtl');
    });
  });
});
