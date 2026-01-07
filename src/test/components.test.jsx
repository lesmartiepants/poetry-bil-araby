import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock components for testing
const MysticalConsultationEffect = ({ active, theme }) => {
  if (!active) return null
  return (
    <div className="mystical-effect" data-testid="mystical-effect">
      <div className={`glow ${theme.glow}`} />
    </div>
  )
}

const DebugPanel = ({ logs, onClear, darkMode }) => {
  return (
    <div
      className={`debug-panel ${darkMode ? 'dark' : 'light'}`}
      data-testid="debug-panel"
    >
      <div>
        <span>System Logs ({logs.length})</span>
        <button onClick={onClear} data-testid="clear-logs">Clear</button>
      </div>
      <div className="logs">
        {logs.map((log, idx) => (
          <div key={idx} className={`log-entry ${log.type}`}>
            [{log.time}] {log.label}: {log.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

const CategoryPill = ({ selected, onSelect, darkMode }) => {
  const categories = [
    { id: "All", labelAr: "كل الشعراء" },
    { id: "Nizar Qabbani", labelAr: "نزار قباني" },
    { id: "Mahmoud Darwish", labelAr: "محمود درويش" }
  ]
  const currentCat = categories.find(c => c.id === selected) || categories[0]

  return (
    <div className="category-pill" data-testid="category-pill">
      <button
        onClick={() => onSelect(categories[1].id)}
        data-testid="category-button"
      >
        {currentCat.labelAr}
      </button>
    </div>
  )
}

describe('Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MysticalConsultationEffect', () => {
    const mockTheme = {
      glow: 'from-indigo-600/30 via-purple-600/15 to-transparent'
    }

    it('renders when active is true', () => {
      const { getByTestId } = render(
        <MysticalConsultationEffect active={true} theme={mockTheme} />
      )

      expect(getByTestId('mystical-effect')).toBeInTheDocument()
    })

    it('does not render when active is false', () => {
      const { queryByTestId } = render(
        <MysticalConsultationEffect active={false} theme={mockTheme} />
      )

      expect(queryByTestId('mystical-effect')).not.toBeInTheDocument()
    })

    it('applies theme glow classes', () => {
      const { container } = render(
        <MysticalConsultationEffect active={true} theme={mockTheme} />
      )

      const glowElement = container.querySelector('.glow')
      expect(glowElement).toBeInTheDocument()
      expect(glowElement.className).toContain(mockTheme.glow)
    })

    it('toggles visibility based on active prop changes', () => {
      const { queryByTestId, rerender } = render(
        <MysticalConsultationEffect active={true} theme={mockTheme} />
      )

      expect(queryByTestId('mystical-effect')).toBeInTheDocument()

      rerender(<MysticalConsultationEffect active={false} theme={mockTheme} />)

      expect(queryByTestId('mystical-effect')).not.toBeInTheDocument()
    })
  })

  describe('DebugPanel', () => {
    const mockLogs = [
      { time: '10:30:45', label: 'Info', msg: 'Test message', type: 'info' },
      { time: '10:31:00', label: 'Error', msg: 'Error message', type: 'error' },
      { time: '10:31:15', label: 'Success', msg: 'Success message', type: 'success' }
    ]

    it('renders with logs', () => {
      const { getByTestId } = render(
        <DebugPanel logs={mockLogs} onClear={vi.fn()} darkMode={true} />
      )

      expect(getByTestId('debug-panel')).toBeInTheDocument()
    })

    it('displays correct number of logs', () => {
      const { getByText } = render(
        <DebugPanel logs={mockLogs} onClear={vi.fn()} darkMode={true} />
      )

      expect(getByText(/System Logs \(3\)/)).toBeInTheDocument()
    })

    it('renders each log entry', () => {
      const { container } = render(
        <DebugPanel logs={mockLogs} onClear={vi.fn()} darkMode={true} />
      )

      const logEntries = container.querySelectorAll('.log-entry')
      expect(logEntries.length).toBe(3)
    })

    it('applies correct log type classes', () => {
      const { container } = render(
        <DebugPanel logs={mockLogs} onClear={vi.fn()} darkMode={true} />
      )

      const infoLog = container.querySelector('.log-entry.info')
      const errorLog = container.querySelector('.log-entry.error')
      const successLog = container.querySelector('.log-entry.success')

      expect(infoLog).toBeInTheDocument()
      expect(errorLog).toBeInTheDocument()
      expect(successLog).toBeInTheDocument()
    })

    it('calls onClear when clear button is clicked', async () => {
      const onClear = vi.fn()
      const { getByTestId } = render(
        <DebugPanel logs={mockLogs} onClear={onClear} darkMode={true} />
      )

      const clearButton = getByTestId('clear-logs')
      await userEvent.click(clearButton)

      expect(onClear).toHaveBeenCalledTimes(1)
    })

    it('applies dark mode class', () => {
      const { getByTestId } = render(
        <DebugPanel logs={mockLogs} onClear={vi.fn()} darkMode={true} />
      )

      const panel = getByTestId('debug-panel')
      expect(panel.className).toContain('dark')
    })

    it('applies light mode class', () => {
      const { getByTestId } = render(
        <DebugPanel logs={mockLogs} onClear={vi.fn()} darkMode={false} />
      )

      const panel = getByTestId('debug-panel')
      expect(panel.className).toContain('light')
    })

    it('handles empty logs array', () => {
      const { getByText } = render(
        <DebugPanel logs={[]} onClear={vi.fn()} darkMode={true} />
      )

      expect(getByText(/System Logs \(0\)/)).toBeInTheDocument()
    })

    it('displays log timestamps', () => {
      const { getByText } = render(
        <DebugPanel logs={mockLogs} onClear={vi.fn()} darkMode={true} />
      )

      expect(getByText(/\[10:30:45\]/)).toBeInTheDocument()
      expect(getByText(/\[10:31:00\]/)).toBeInTheDocument()
    })

    it('displays log labels and messages', () => {
      const { getByText } = render(
        <DebugPanel logs={mockLogs} onClear={vi.fn()} darkMode={true} />
      )

      expect(getByText(/Info:.*Test message/)).toBeInTheDocument()
      expect(getByText(/Error:.*Error message/)).toBeInTheDocument()
    })
  })

  describe('CategoryPill', () => {
    it('renders with selected category', () => {
      const { getByTestId } = render(
        <CategoryPill selected="All" onSelect={vi.fn()} darkMode={true} />
      )

      expect(getByTestId('category-pill')).toBeInTheDocument()
    })

    it('displays current category in Arabic', () => {
      const { getByText } = render(
        <CategoryPill selected="All" onSelect={vi.fn()} darkMode={true} />
      )

      expect(getByText('كل الشعراء')).toBeInTheDocument()
    })

    it('displays correct category when selection changes', () => {
      const { getByText, rerender } = render(
        <CategoryPill selected="All" onSelect={vi.fn()} darkMode={true} />
      )

      expect(getByText('كل الشعراء')).toBeInTheDocument()

      rerender(
        <CategoryPill selected="Nizar Qabbani" onSelect={vi.fn()} darkMode={true} />
      )

      expect(getByText('نزار قباني')).toBeInTheDocument()
    })

    it('calls onSelect when category is changed', async () => {
      const onSelect = vi.fn()
      const { getByTestId } = render(
        <CategoryPill selected="All" onSelect={onSelect} darkMode={true} />
      )

      const button = getByTestId('category-button')
      await userEvent.click(button)

      expect(onSelect).toHaveBeenCalledWith('Nizar Qabbani')
    })

    it('handles invalid selected category gracefully', () => {
      const { getByText } = render(
        <CategoryPill selected="NonExistent" onSelect={vi.fn()} darkMode={true} />
      )

      // Should default to first category
      expect(getByText('كل الشعراء')).toBeInTheDocument()
    })

    it('renders in both dark and light modes', () => {
      const { rerender, getByTestId } = render(
        <CategoryPill selected="All" onSelect={vi.fn()} darkMode={true} />
      )

      expect(getByTestId('category-pill')).toBeInTheDocument()

      rerender(
        <CategoryPill selected="All" onSelect={vi.fn()} darkMode={false} />
      )

      expect(getByTestId('category-pill')).toBeInTheDocument()
    })
  })

  describe('Audio Button States', () => {
    const PlayButton = ({ isPlaying, isGenerating, onClick }) => {
      return (
        <button
          onClick={onClick}
          disabled={isGenerating}
          data-testid="play-button"
          className={isGenerating ? 'generating' : ''}
        >
          {isGenerating ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
        </button>
      )
    }

    it('shows play state initially', () => {
      const { getByText } = render(
        <PlayButton isPlaying={false} isGenerating={false} onClick={vi.fn()} />
      )

      expect(getByText('Play')).toBeInTheDocument()
    })

    it('shows pause state when playing', () => {
      const { getByText } = render(
        <PlayButton isPlaying={true} isGenerating={false} onClick={vi.fn()} />
      )

      expect(getByText('Pause')).toBeInTheDocument()
    })

    it('shows loading state when generating', () => {
      const { getByText } = render(
        <PlayButton isPlaying={false} isGenerating={true} onClick={vi.fn()} />
      )

      expect(getByText('Loading')).toBeInTheDocument()
    })

    it('is disabled when generating', () => {
      const { getByTestId } = render(
        <PlayButton isPlaying={false} isGenerating={true} onClick={vi.fn()} />
      )

      expect(getByTestId('play-button')).toBeDisabled()
    })

    it('calls onClick when clicked', async () => {
      const onClick = vi.fn()
      const { getByTestId } = render(
        <PlayButton isPlaying={false} isGenerating={false} onClick={onClick} />
      )

      await userEvent.click(getByTestId('play-button'))

      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('applies generating class when generating', () => {
      const { getByTestId } = render(
        <PlayButton isPlaying={false} isGenerating={true} onClick={vi.fn()} />
      )

      expect(getByTestId('play-button').className).toContain('generating')
    })
  })

  describe('Copy Button States', () => {
    const CopyButton = ({ copied, onClick }) => {
      return (
        <button
          onClick={onClick}
          data-testid="copy-button"
          className={copied ? 'success' : ''}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )
    }

    it('shows copy text initially', () => {
      const { getByText } = render(
        <CopyButton copied={false} onClick={vi.fn()} />
      )

      expect(getByText('Copy')).toBeInTheDocument()
    })

    it('shows success text after copying', () => {
      const { getByText } = render(
        <CopyButton copied={true} onClick={vi.fn()} />
      )

      expect(getByText('Copied!')).toBeInTheDocument()
    })

    it('applies success class when copied', () => {
      const { getByTestId } = render(
        <CopyButton copied={true} onClick={vi.fn()} />
      )

      expect(getByTestId('copy-button').className).toContain('success')
    })

    it('calls onClick when clicked', async () => {
      const onClick = vi.fn()
      const { getByTestId } = render(
        <CopyButton copied={false} onClick={onClick} />
      )

      await userEvent.click(getByTestId('copy-button'))

      expect(onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Navigation Buttons', () => {
    const NavigationButtons = ({ onNext, onPrev, disabled }) => {
      return (
        <div>
          <button
            onClick={onPrev}
            disabled={disabled}
            data-testid="prev-button"
          >
            Previous
          </button>
          <button
            onClick={onNext}
            disabled={disabled}
            data-testid="next-button"
          >
            Next
          </button>
        </div>
      )
    }

    it('renders both navigation buttons', () => {
      const { getByTestId } = render(
        <NavigationButtons onNext={vi.fn()} onPrev={vi.fn()} disabled={false} />
      )

      expect(getByTestId('prev-button')).toBeInTheDocument()
      expect(getByTestId('next-button')).toBeInTheDocument()
    })

    it('calls onNext when next button is clicked', async () => {
      const onNext = vi.fn()
      const { getByTestId } = render(
        <NavigationButtons onNext={onNext} onPrev={vi.fn()} disabled={false} />
      )

      await userEvent.click(getByTestId('next-button'))

      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('calls onPrev when previous button is clicked', async () => {
      const onPrev = vi.fn()
      const { getByTestId } = render(
        <NavigationButtons onNext={vi.fn()} onPrev={onPrev} disabled={false} />
      )

      await userEvent.click(getByTestId('prev-button'))

      expect(onPrev).toHaveBeenCalledTimes(1)
    })

    it('disables both buttons when disabled is true', () => {
      const { getByTestId } = render(
        <NavigationButtons onNext={vi.fn()} onPrev={vi.fn()} disabled={true} />
      )

      expect(getByTestId('prev-button')).toBeDisabled()
      expect(getByTestId('next-button')).toBeDisabled()
    })

    it('enables both buttons when disabled is false', () => {
      const { getByTestId } = render(
        <NavigationButtons onNext={vi.fn()} onPrev={vi.fn()} disabled={false} />
      )

      expect(getByTestId('prev-button')).not.toBeDisabled()
      expect(getByTestId('next-button')).not.toBeDisabled()
    })
  })

  describe('Theme Toggle Button', () => {
    const ThemeToggle = ({ darkMode, onToggle }) => {
      return (
        <button
          onClick={onToggle}
          data-testid="theme-toggle"
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? 'Sun' : 'Moon'}
        </button>
      )
    }

    it('shows sun icon in dark mode', () => {
      const { getByText } = render(
        <ThemeToggle darkMode={true} onToggle={vi.fn()} />
      )

      expect(getByText('Sun')).toBeInTheDocument()
    })

    it('shows moon icon in light mode', () => {
      const { getByText } = render(
        <ThemeToggle darkMode={false} onToggle={vi.fn()} />
      )

      expect(getByText('Moon')).toBeInTheDocument()
    })

    it('calls onToggle when clicked', async () => {
      const onToggle = vi.fn()
      const { getByTestId } = render(
        <ThemeToggle darkMode={true} onToggle={onToggle} />
      )

      await userEvent.click(getByTestId('theme-toggle'))

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('has appropriate aria-label', () => {
      const { getByTestId, rerender } = render(
        <ThemeToggle darkMode={true} onToggle={vi.fn()} />
      )

      expect(getByTestId('theme-toggle')).toHaveAttribute(
        'aria-label',
        'Switch to light mode'
      )

      rerender(<ThemeToggle darkMode={false} onToggle={vi.fn()} />)

      expect(getByTestId('theme-toggle')).toHaveAttribute(
        'aria-label',
        'Switch to dark mode'
      )
    })
  })
})
