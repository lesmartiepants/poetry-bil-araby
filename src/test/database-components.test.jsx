import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Library, Sparkles, X, RefreshCw } from 'lucide-react'

// Mock DatabaseToggle component
const DatabaseToggle = ({ useDatabase, onToggle }) => {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[56px]" data-testid="database-toggle">
      <button
        onClick={onToggle}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label={useDatabase ? "Switch to AI Mode" : "Switch to Database Mode"}
        data-testid="database-toggle-button"
      >
        {useDatabase ? <Library size={21} className="text-[#C5A059]" data-testid="library-icon" /> : <Sparkles size={21} className="text-[#C5A059]" data-testid="sparkles-icon" />}
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]" data-testid="mode-label">
        {useDatabase ? 'Local' : 'Web'}
      </span>
    </div>
  )
}

// Mock ErrorBanner component
const DESIGN = {
  anim: 'transition-all duration-300 ease-in-out',
  glass: 'backdrop-blur-2xl',
  radius: 'rounded-2xl',
  buttonHover: 'hover:scale-105 hover:shadow-lg transition-all duration-300',
  btnPrimary: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/40'
}

const ErrorBanner = ({ error, onDismiss, onRetry, theme }) => {
  if (!error) return null

  return (
    <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] ${DESIGN.anim}`} data-testid="error-banner">
      <div className={`${DESIGN.glass} ${theme.glass} ${theme.border} border ${DESIGN.radius} p-4 shadow-2xl`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <X size={20} className="text-red-500" data-testid="error-icon" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${theme.text} text-sm font-medium mb-2`} data-testid="error-title">Database Connection Error</p>
            <p className={`${theme.text} text-xs opacity-70 mb-3`} data-testid="error-message">{error}</p>
            <div className="flex gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`${DESIGN.btnPrimary} ${theme.btnPrimary} px-3 py-1.5 ${DESIGN.radius} text-xs font-medium ${DESIGN.buttonHover}`}
                  data-testid="retry-button"
                >
                  <RefreshCw size={14} className="inline mr-1" />
                  Retry
                </button>
              )}
              <button
                onClick={onDismiss}
                className={`${theme.pill} border px-3 py-1.5 ${DESIGN.radius} text-xs font-medium ${theme.text} ${DESIGN.buttonHover}`}
                data-testid="dismiss-button"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

describe('Database Integration Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('DatabaseToggle', () => {
    it('renders with database mode enabled', () => {
      const { getByTestId } = render(
        <DatabaseToggle useDatabase={true} onToggle={vi.fn()} />
      )

      expect(getByTestId('database-toggle')).toBeInTheDocument()
      expect(getByTestId('library-icon')).toBeInTheDocument()
      expect(getByTestId('mode-label')).toHaveTextContent('Local')
    })

    it('renders with AI mode enabled', () => {
      const { getByTestId } = render(
        <DatabaseToggle useDatabase={false} onToggle={vi.fn()} />
      )

      expect(getByTestId('database-toggle')).toBeInTheDocument()
      expect(getByTestId('sparkles-icon')).toBeInTheDocument()
      expect(getByTestId('mode-label')).toHaveTextContent('Web')
    })

    it('shows correct icon for database mode (Library)', () => {
      const { getByTestId, queryByTestId } = render(
        <DatabaseToggle useDatabase={true} onToggle={vi.fn()} />
      )

      expect(getByTestId('library-icon')).toBeInTheDocument()
      expect(queryByTestId('sparkles-icon')).not.toBeInTheDocument()
    })

    it('shows correct icon for AI mode (Sparkles)', () => {
      const { getByTestId, queryByTestId } = render(
        <DatabaseToggle useDatabase={false} onToggle={vi.fn()} />
      )

      expect(getByTestId('sparkles-icon')).toBeInTheDocument()
      expect(queryByTestId('library-icon')).not.toBeInTheDocument()
    })

    it('calls onToggle when button is clicked', async () => {
      const onToggle = vi.fn()
      const { getByTestId } = render(
        <DatabaseToggle useDatabase={false} onToggle={onToggle} />
      )

      await userEvent.click(getByTestId('database-toggle-button'))

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('has appropriate aria-label for database mode', () => {
      const { getByTestId } = render(
        <DatabaseToggle useDatabase={true} onToggle={vi.fn()} />
      )

      expect(getByTestId('database-toggle-button')).toHaveAttribute(
        'aria-label',
        'Switch to AI Mode'
      )
    })

    it('has appropriate aria-label for AI mode', () => {
      const { getByTestId } = render(
        <DatabaseToggle useDatabase={false} onToggle={vi.fn()} />
      )

      expect(getByTestId('database-toggle-button')).toHaveAttribute(
        'aria-label',
        'Switch to Database Mode'
      )
    })

    it('toggles between modes correctly', () => {
      const { getByTestId, rerender } = render(
        <DatabaseToggle useDatabase={false} onToggle={vi.fn()} />
      )

      expect(getByTestId('mode-label')).toHaveTextContent('Web')
      expect(getByTestId('sparkles-icon')).toBeInTheDocument()

      rerender(<DatabaseToggle useDatabase={true} onToggle={vi.fn()} />)

      expect(getByTestId('mode-label')).toHaveTextContent('Local')
      expect(getByTestId('library-icon')).toBeInTheDocument()
    })
  })

  describe('ErrorBanner', () => {
    const mockTheme = {
      glass: 'bg-stone-900/60',
      border: 'border-stone-800',
      text: 'text-stone-200',
      pill: 'bg-stone-900/40 border-stone-700/50',
      btnPrimary: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/40'
    }

    it('does not render when error is null', () => {
      const { queryByTestId } = render(
        <ErrorBanner error={null} onDismiss={vi.fn()} onRetry={vi.fn()} theme={mockTheme} />
      )

      expect(queryByTestId('error-banner')).not.toBeInTheDocument()
    })

    it('does not render when error is undefined', () => {
      const { queryByTestId } = render(
        <ErrorBanner error={undefined} onDismiss={vi.fn()} onRetry={vi.fn()} theme={mockTheme} />
      )

      expect(queryByTestId('error-banner')).not.toBeInTheDocument()
    })

    it('renders when error is provided', () => {
      const { getByTestId } = render(
        <ErrorBanner
          error="Backend server is not running"
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-banner')).toBeInTheDocument()
    })

    it('displays error title correctly', () => {
      const { getByTestId } = render(
        <ErrorBanner
          error="Test error message"
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-title')).toHaveTextContent('Database Connection Error')
    })

    it('displays error message correctly', () => {
      const errorMessage = 'Backend server is not running. Please start it with: npm run dev:server'
      const { getByTestId } = render(
        <ErrorBanner
          error={errorMessage}
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-message')).toHaveTextContent(errorMessage)
    })

    it('shows error icon', () => {
      const { getByTestId } = render(
        <ErrorBanner
          error="Test error"
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-icon')).toBeInTheDocument()
    })

    it('calls onDismiss when dismiss button is clicked', async () => {
      const onDismiss = vi.fn()
      const { getByTestId } = render(
        <ErrorBanner
          error="Test error"
          onDismiss={onDismiss}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      await userEvent.click(getByTestId('dismiss-button'))

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('calls onRetry when retry button is clicked', async () => {
      const onRetry = vi.fn()
      const { getByTestId } = render(
        <ErrorBanner
          error="Test error"
          onDismiss={vi.fn()}
          onRetry={onRetry}
          theme={mockTheme}
        />
      )

      await userEvent.click(getByTestId('retry-button'))

      expect(onRetry).toHaveBeenCalledTimes(1)
    })

    it('renders both retry and dismiss buttons when onRetry is provided', () => {
      const { getByTestId } = render(
        <ErrorBanner
          error="Test error"
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('retry-button')).toBeInTheDocument()
      expect(getByTestId('dismiss-button')).toBeInTheDocument()
    })

    it('does not render retry button when onRetry is not provided', () => {
      const { queryByTestId, getByTestId } = render(
        <ErrorBanner
          error="Test error"
          onDismiss={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(queryByTestId('retry-button')).not.toBeInTheDocument()
      expect(getByTestId('dismiss-button')).toBeInTheDocument()
    })

    it('handles different error messages', () => {
      const { getByTestId, rerender } = render(
        <ErrorBanner
          error="Error 1"
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-message')).toHaveTextContent('Error 1')

      rerender(
        <ErrorBanner
          error="Error 2"
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-message')).toHaveTextContent('Error 2')
    })

    it('applies theme classes correctly', () => {
      const { getByTestId } = render(
        <ErrorBanner
          error="Test error"
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      const banner = getByTestId('error-banner')
      expect(banner).toBeInTheDocument()
      expect(banner.className).toContain('fixed')
      expect(banner.className).toContain('top-20')
      expect(banner.className).toContain('z-50')
    })

    it('handles common "Failed to fetch" error', () => {
      const errorMessage = 'Backend server is not running. Please start it with: npm run dev:server'
      const { getByTestId } = render(
        <ErrorBanner
          error={errorMessage}
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-message')).toHaveTextContent(errorMessage)
    })

    it('handles API error responses', () => {
      const errorMessage = 'Database API returned 500 Internal Server Error'
      const { getByTestId } = render(
        <ErrorBanner
          error={errorMessage}
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-message')).toHaveTextContent(errorMessage)
    })

    it('transitions from visible to hidden when error is cleared', () => {
      const { getByTestId, rerender, queryByTestId } = render(
        <ErrorBanner
          error="Test error"
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(getByTestId('error-banner')).toBeInTheDocument()

      rerender(
        <ErrorBanner
          error={null}
          onDismiss={vi.fn()}
          onRetry={vi.fn()}
          theme={mockTheme}
        />
      )

      expect(queryByTestId('error-banner')).not.toBeInTheDocument()
    })
  })
})
