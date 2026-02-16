import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DiwanApp from '../app.jsx'

describe('Design review route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    window.history.pushState({}, '', '/design-review')
  })

  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('renders the design review workspace', () => {
    render(<DiwanApp />)

    expect(screen.getByRole('heading', { name: /design review workspace/i })).toBeInTheDocument()
    expect(screen.getByText(/review splash designs directly on this deployed site/i)).toBeInTheDocument()
  })

  it('adds a feedback entry from the form', async () => {
    render(<DiwanApp />)

    await userEvent.type(screen.getByLabelText(/feedback summary/i), 'Improve header contrast')
    await userEvent.type(screen.getByLabelText(/details/i), 'Increase heading contrast ratio on mobile.')
    await userEvent.click(screen.getByRole('button', { name: /add feedback entry/i }))

    expect(screen.getByText('Improve header contrast')).toBeInTheDocument()
    expect(screen.getByText(/saved feedback \(1\)/i)).toBeInTheDocument()
  })

  it('shows GitHub issue link when repository is provided', async () => {
    render(<DiwanApp />)

    await userEvent.type(screen.getByLabelText(/github repo \(owner\/repo\)/i), 'example-org/example-repo')

    const issueLink = screen.getByRole('link', { name: /open github issue/i })
    expect(issueLink).toBeInTheDocument()
    expect(issueLink.getAttribute('href')).toContain('github.com/example-org/example-repo/issues/new')
  })
})
