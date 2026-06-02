# Library v3 — Prod-accurate mockups

Three new design directions. Each HTML file renders the **full production app UI** as the background (poem text, header wordmark, sidebar, controls) so you can see exactly how each library variant integrates into the real app.

## Files

| File | Direction | Aesthetic | Key idea |
|------|-----------|-----------|----------|
| `d-rayyan.html` | **D · Rayyan · ريَّان** | Top product designer · Linear / Vercel / Arc | Command-palette overlay (⌘K). Split list + preview. Keyboard shortcuts visible. No full-screen takeover — opens inline above the poem. |
| `e-waraqa.html` | **E · Waraqa · وَرَقَة** | Indie / Bear Notes / Craft / Obsidian | Floating card pinned to the left of the sidebar. **No scrim** — the main poem stays readable alongside your collection. Pinned strip, time groups, excerpt previews. |
| `f-loh.html` | **F · Loh · لَوح** | Editorial / Art director / Pentagram / NYT Magazine | Full-screen gallery. Each poem is a unique-gradient cover card. Featured tile (2×2). Hover reveals Read + Share. Gallery / museum experience. |

## What's shared

- `_prod-bg.css` — shared CSS that recreates the exact prod background: dark `#0c0c0e`, ambient radial gradients, subtle grid, top-right "poetry بالعربي" wordmark, right-side controls, sidebar hint
- All three use the app's exact font stack: `Reem Kufi`, `Amiri`, `Fustat`, `Bodoni Moda`, `Forum`, `Tajawal`
- All three use exact color tokens: `--gold: #C5A059`, `--lapis: #4A7CC9`, glass surfaces

## Comparison

| | D · Rayyan | E · Waraqa | F · Loh |
|---|---|---|---|
| Covers poem | partial scrim | **none** | fully |
| Modal type | palette (top) | floating card | full-screen |
| Nav paradigm | keyboard ↑↓↵ | click + hover | click + hover |
| Preview | inline right pane | excerpt in list | cover gradient |
| Bulk actions | — | export | — |
| Implementation cost | 🟡 medium | 🟢 low | 🟠 high |
| Best for | power users | casual readers | collectors |
