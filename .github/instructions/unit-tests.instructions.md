---
applyTo: "src/test/**/*.test.jsx,src/test/**/*.test.js"
---

# Unit Tests

**Framework:** Vitest + React Testing Library + happy-dom (frontend), Supertest (backend)
**Run:** `npm test` (watch), `npm run test:run` (CI), `npm run test:coverage`

## Structure

```javascript
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  test('should do something', async () => {
    const user = userEvent.setup();
    render(<Component />);
    await user.click(screen.getByRole('button', { name: /play/i }));
    await expect(screen.findByText('Playing')).resolves.toBeInTheDocument();
  });
});
```

## Best Practices

**Queries (priority order):**
1. `getByRole` (accessible, best)
2. `getByLabelText` (forms)
3. `getByText` (content)
4. `getByTestId` (last resort)

**Async:** Use `findBy*` (includes wait) or `waitFor` for complex conditions
**Mocking:** Keep simple, mock API calls and env vars

**Timeouts:** CI=3s, Local=5s (aggressive, keep tests fast)

## Backend Tests

```javascript
import request from 'supertest';
import app from '../server.js';

test('GET /api/health returns 200', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});
```

## Arabic Testing

- Use actual Arabic text: العنوان not transliteration
- Verify `dir="rtl"` attribute
- Check `font-amiri` or `font-tajawal` usage
