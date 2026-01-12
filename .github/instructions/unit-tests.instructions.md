---
applyTo: "src/test/**/*.test.jsx"
---

# Unit Test Instructions

## Testing Framework

- **Vitest** + **React Testing Library** + **happy-dom**
- Run with: `npm test` (watch), `npm run test:run` (CI)
- Coverage: `npm run test:coverage`

## Test Structure

```javascript
import { describe, test, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('ComponentName', () => {
  beforeEach(() => {
    // Setup
  });

  test('should do something specific', () => {
    // Arrange, Act, Assert
  });
});
```

## Best Practices

### Test Organization
- Use `describe()` blocks for grouping related tests
- One `describe` per component or feature
- Clear, descriptive test names: `should render poem title correctly`

### Queries
Prefer queries in this order:
1. `getByRole` - Accessible queries (best)
2. `getByLabelText` - Form elements
3. `getByText` - Content queries
4. `getByTestId` - Last resort

```javascript
// ✅ Good - accessible query
const button = screen.getByRole('button', { name: /play/i });

// ⚠️ Acceptable - text query
const title = screen.getByText('العنوان');

// ❌ Avoid - test IDs (use only when necessary)
const element = screen.getByTestId('custom-component');
```

### User Interactions
- Use `@testing-library/user-event` for user interactions
- Import as: `import userEvent from '@testing-library/user-event';`

```javascript
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
```

### Async Testing
- Always use `await` with queries that return promises
- Use `findBy*` for async elements (includes waiting)
- Use `waitFor` for complex async conditions

```javascript
// ✅ Good - findBy includes waiting
const element = await screen.findByText('Loaded content');

// ✅ Good - waitFor for custom conditions
await waitFor(() => {
  expect(screen.getByText('Error')).toBeInTheDocument();
});
```

### Mocking
- Mock Gemini API calls in tests
- Mock `import.meta.env` for environment variables
- Keep mocks simple and focused

```javascript
// Mock API
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: vi.fn(),
  })),
}));
```

## Timeouts

- **CI timeout:** 3 seconds per test (aggressive)
- **Local timeout:** 5 seconds per test
- Tests should complete quickly (<1s ideal)
- If test needs more time, it's probably too complex

## Arabic Content Testing

- Test with actual Arabic text (not Lorem Ipsum)
- Verify RTL rendering: `dir="rtl"` attribute
- Check font usage: `font-amiri` or `font-tajawal`

## Coverage Goals

- Focus on critical paths and user flows
- Don't test implementation details
- Test behavior, not structure
- Coverage reports generated with: `npm run test:coverage`

## Common Patterns

### Testing Theme Toggle
```javascript
test('should toggle between dark and light theme', async () => {
  const user = userEvent.setup();
  render(<DiwanApp />);
  
  const themeButton = screen.getByRole('button', { name: /theme/i });
  await user.click(themeButton);
  
  // Verify theme changed
  expect(document.body).toHaveClass('light-mode');
});
```

### Testing API Integration
```javascript
test('should fetch poem insights', async () => {
  const mockInsight = { text: 'Analysis...' };
  global.fetch = vi.fn(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockInsight),
    })
  );
  
  // Test implementation
});
```

## CI Considerations

- Tests run with `vitest run` in CI (no watch mode)
- Fail-fast enabled in CI
- Check `vitest.config.js` for CI-specific settings
- Process.env.CI is detected automatically
