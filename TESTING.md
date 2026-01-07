# Testing Infrastructure

This document describes the comprehensive testing setup for the Poetry Bil-Araby application.

## Overview

The application uses **Vitest** as the test runner with **React Testing Library** for component testing. All tests are integrated into the CI/CD pipeline and run automatically on every push and pull request.

## Test Statistics

- **Total Tests**: 113
- **Test Files**: 3
- **Coverage**: Component tests, utility tests, and integration tests

## Test Structure

```
src/
├── test/
│   ├── setup.js              # Global test configuration and mocks
│   ├── utils.jsx             # Test helper functions
│   ├── App.test.jsx          # Main application component tests
│   ├── components.test.jsx   # Individual component tests
│   └── utils.test.jsx        # Utility function tests
├── app.jsx                   # Main application component
└── main.jsx                  # Application entry point
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run tests with UI
```bash
npm run test:ui
```

### Generate coverage report
```bash
npm run test:coverage
```

## Test Coverage

### Component Tests (App.test.jsx)
- **Smoke Tests**: Ensures the application renders without crashing
- **Theme System**: Tests dark/light mode toggle functionality
- **Category Filtering**: Tests poet category selection and filtering
- **Navigation**: Tests poem navigation controls
- **Audio Player**: Tests audio playback state management
- **Poem Discovery**: Tests fetching new poems from Gemini API
- **Copy Functionality**: Tests clipboard operations
- **Analysis Feature**: Tests poem interpretation features
- **Debug Panel**: Tests logging and debugging features
- **Responsive Layout**: Tests mobile and desktop layouts
- **RTL Support**: Tests Arabic text rendering and direction
- **Error Handling**: Tests graceful error recovery
- **Performance**: Tests memoization and cleanup

### Component Unit Tests (components.test.jsx)
- **MysticalConsultationEffect**: Tests visual effects during analysis
- **DebugPanel**: Tests log display and management
- **CategoryPill**: Tests category dropdown functionality
- **Audio Button States**: Tests play/pause/loading states
- **Copy Button States**: Tests copy success indicators
- **Navigation Buttons**: Tests prev/next functionality
- **Theme Toggle**: Tests theme switch button

### Utility Tests (utils.test.jsx)
- **pcm16ToWav Conversion**: Tests audio format conversion
- **Category Filtering Logic**: Tests poem filtering algorithms
- **Verse Pairing Logic**: Tests Arabic/English text alignment
- **Interpretation Parsing**: Tests AI response parsing
- **Theme Constants**: Tests theme configuration
- **Category Configuration**: Tests poet categories
- **Log Creation**: Tests logging utility functions
- **URL Management**: Tests blob URL handling

## Mock Setup

### Global Mocks (setup.js)

#### Audio API
```javascript
global.Audio = class MockAudio {
  constructor() {
    this.play = vi.fn().mockResolvedValue(undefined)
    this.pause = vi.fn()
    this.addEventListener = vi.fn()
    this.removeEventListener = vi.fn()
    this.load = vi.fn()
    this.src = ''
  }
}
```

#### URL API
```javascript
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()
```

#### Fetch API
```javascript
global.fetch = vi.fn()
```

#### Clipboard API
```javascript
document.execCommand = vi.fn(() => true)
```

## Test Utilities

### Custom Render Function
```javascript
renderWithProviders(ui, options)
```

### Mock Data Helpers
```javascript
createMockPoem(overrides)
createMockGeminiResponse(data)
```

### API Mock Helpers
```javascript
mockSuccessfulFetch(data)
mockFailedFetch(error)
```

## CI/CD Integration

Tests are automatically run in GitHub Actions on:
- Push to `main` branch
- Pull requests to `main` branch

### CI Workflow
1. **Build**: Compile the application
2. **Test**: Run all tests
3. **Coverage**: Generate and upload coverage reports
4. **Visual Tests**: Run visual regression tests (placeholder)
5. **Deploy Preview**: Create preview deployments

### Coverage Reporting
Coverage reports are uploaded to Codecov and displayed in pull requests.

## Writing New Tests

### Component Test Template
```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    render(<ComponentName />)
    await userEvent.click(screen.getByRole('button'))
    expect(/* assertion */).toBeTruthy()
  })
})
```

### Utility Test Template
```javascript
import { describe, it, expect } from 'vitest'

describe('utilityFunction', () => {
  it('performs expected operation', () => {
    const result = utilityFunction(input)
    expect(result).toBe(expectedOutput)
  })

  it('handles edge cases', () => {
    const result = utilityFunction(edgeCase)
    expect(result).toBe(expectedBehavior)
  })
})
```

## Best Practices

### DO
- Write descriptive test names that explain what is being tested
- Test user behavior, not implementation details
- Use Testing Library queries in order of preference: getByRole > getByLabelText > getByText
- Mock external dependencies (APIs, Audio, etc.)
- Clean up after each test (automatically handled by afterEach)
- Test both happy paths and error cases

### DON'T
- Test implementation details (internal state, props)
- Rely on CSS classes or internal structure
- Write tests that depend on other tests
- Mock what you don't own (React, DOM APIs) unless necessary
- Skip accessibility considerations

## Debugging Tests

### Run a specific test file
```bash
npm test -- src/test/App.test.jsx
```

### Run a specific test
```bash
npm test -- -t "test name"
```

### Enable debug output
```bash
npm test -- --reporter=verbose
```

### View test UI
```bash
npm run test:ui
```

## Troubleshooting

### Tests fail with "Audio is not a constructor"
Ensure the Audio mock in `setup.js` uses a class, not a function:
```javascript
global.Audio = class MockAudio { /* ... */ }
```

### Tests timeout
Increase timeout in `vitest.config.js`:
```javascript
test: {
  testTimeout: 10000
}
```

### Coverage not generating
Install v8 provider:
```bash
npm install -D @vitest/coverage-v8
```

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Add visual regression tests with Chromatic
- [ ] Add performance benchmarks
- [ ] Add accessibility tests with axe-core
- [ ] Increase coverage to 90%+
- [ ] Add mutation testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
