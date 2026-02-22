---
applyTo: "src/**/*.jsx"
---

# React Components

**Style:** Functional components with hooks only
**State:** All in `DiwanApp` component (no Redux/Zustand)
**Hooks:** `useState`, `useEffect`, `useRef`, `useMemo`

## Styling

**Always use DESIGN/THEME constants** - never hardcode Tailwind:

```javascript
// ✅ DO
<div className={`${THEME[theme].background} ${DESIGN.spacing.padding}`}>

// ❌ DON'T
<div className="bg-gray-900 p-4">
```

**Arabic:**
- `font-amiri` for poems (serif)
- `font-tajawal` for UI (sans-serif)
- Always `dir="rtl"` for Arabic content
- Test with actual Arabic: العنوان not al-'unwān

**Theme:** Reference `THEME[theme].primary`, `.background`, etc.

## Patterns

**State:** Pass via props one level max (flat hierarchy)
**Events:** Descriptive names (`handlePlayClick`, `handleThemeToggle`)
**API:** Check `import.meta.env.VITE_GEMINI_API_KEY` exists before calls
**Accessibility:** ARIA labels for icon buttons, keyboard navigation
