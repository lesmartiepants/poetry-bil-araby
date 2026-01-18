---
applyTo: "src/**/*.jsx"
---

# React Component Instructions

## Component Style

- Use functional components with hooks (no class components)
- Prefer inline components in `app.jsx` for this single-file architecture
- Keep components focused and single-purpose

## Hooks Usage

- `useState` - Component state
- `useEffect` - Side effects (API calls, subscriptions)
- `useRef` - DOM refs and mutable values that don't trigger re-renders
- `useMemo` - Expensive computations (memoization)

## Styling Requirements

**ALWAYS use DESIGN and THEME constants** instead of hardcoding Tailwind classes:

```javascript
// ❌ DON'T hardcode Tailwind classes
<div className="text-white bg-gray-900 p-4 rounded-lg">

// ✅ DO use DESIGN and THEME constants
<div className={`${THEME[theme].background} ${DESIGN.spacing.padding} ${DESIGN.borders.radius}`}>
```

### Arabic Content Styling

- Use `font-amiri` for poem text (serif, elegant)
- Use `font-tajawal` for UI text (sans-serif, readable)
- Always include `dir="rtl"` for Arabic content
- Test with actual Arabic characters, not Latin placeholders

### Theme Support

- Reference colors via `THEME[theme].primary`, `THEME[theme].background`, etc.
- Dark mode is default; light mode is optional
- Theme state is in `DiwanApp` component

## State Management

- All state lives at the top level in `DiwanApp`
- Pass state and setters as props to child components
- No prop drilling beyond one level (keep hierarchy flat)

## API Calls (Gemini)

- API key from: `import.meta.env.VITE_GEMINI_API_KEY`
- Always check if API key exists before making calls
- Handle loading, success, and error states
- Use `SYSTEM_PROMPT` constant for context

## Event Handlers

- Use descriptive names: `handlePlayClick`, `handleThemeToggle`
- Define inline for simple handlers
- Extract to separate function for complex logic

## Accessibility

- Include ARIA labels for icon-only buttons
- Ensure keyboard navigation works
- Use semantic HTML elements
- Test with screen readers for Arabic content
