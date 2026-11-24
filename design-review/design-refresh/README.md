# Poetry بالعربي · Design refresh

The full design refresh made in Claude Design: brand, pattern library, the app flows and the archive of explored options.

## Open it

Open `index.html` in any browser. It is a single self-contained file with no build step and no server.

- The tabs at the top switch between the four pages: **Brand · final**, **Pattern library · by region**, **App flow** and **Archive**.
- Drag to pan, use the **+ / −** buttons (or ctrl/⌘ + scroll) to zoom, and **FIT** to reset.
- Click any frame to open it full size; use the arrows or ← → keys to step through frames, and Esc to close.
- Link to a page directly with a hash, for example `index.html#bottom` for the App flow.

Fonts load from Google Fonts, so text renders in the brand typefaces when you are online. Offline it falls back to system fonts.

## What's in the folder

| Path | What it is |
| --- | --- |
| `index.html` | The standalone viewer, generated from `canvas/`. Don't edit by hand. |
| `canvas/canvas.json` | The canvas layout: pages, frame positions and titles, section headings and sticky notes. |
| `canvas/*.dc.html` | One file per frame (screen, board or pattern). Each also opens on its own in a browser. |
| `tools/build_viewer.py` | Rebuilds `index.html` from `canvas/`. |
| `tools/viewer_template.html` | The viewer's HTML, CSS and JS. |
| `archive/` | The earlier canvases (5 redesign directions, 10 Reader Concepts, Finalists), each with its own viewer. See `archive/README.md`. |
| `november-app-redesign-review.md` | November app redesign review: the current app's screens, features and jobs to be done, with redesign notes and open decisions. |

## Pages and what to look at

- **Brand · final:** the logo, colour, typography, type roles, pattern and voice (S1–S4), then the newer sheets: Components (S5), Design language and specs (S6), Screen types (S7) and Language and taxonomy (S8). Beside S5 and S6, **Errors and loading** (C20–C23): the margin note, error toast and full-area error, the margin note's tap area, screen reader wording and pressed state, and the loading lines.
- **Pattern library · by region:** a read-me card, then every pattern grouped by where its craft comes from (Andalusia and the Maghreb, Persia, Anatolia, Iraq, Syria, Egypt, Yemen). Frames are coded by region (AN, PE, AT, IQ, SY, EG, YE).
- **App flow (ReDesign2):** every screen, laid out in version bands: **V1** (shell and developer panel, reading, listening, Explore, poet pages, You first build), **V2** (keep and lists, share, Library), **V3** (the guide's doors, saved collections, journey and first run, collections, search, You) and **Later** (delete account and the deferred list). Each screen is numbered N.x, where N is a feature area that never changes (1 Shell · 2 Reading · 3 Listening · 4 Explore · 5 Poet pages · 6 Keep and lists · 7 Share · 8 Library · 9 Journey and first run · 10 Collections · 11 Search · 12 You); a later version continues its area's numbers (Reading is 2.1–2.16 in V1, 2.17–2.18 in V3). Errors and loading states sit in the band of the area they belong to. Gray notes under each screen say where it comes from and where each tap goes. What gets built from these frames is in `docs/redesign2/BUILD-SPEC.md`.
- **Archive:** earlier rounds and options kept for reference.

## Bringing it back into Claude for more iteration

The `canvas/` folder is an exact copy of the Claude Design artifact's `project/` folder. To continue working on it in Claude:

1. Attach this repo (or the `design-review/design-refresh/canvas` folder) to a Claude conversation.
2. Ask Claude to create a new Claude Design artifact and publish every file in `canvas/` to it as `project/<same file name>`, including `canvas.json`.
3. Claude can then keep iterating on the canvas as before. When you're done, copy the artifact's `project/` files back into `canvas/` and run the rebuild below.

The original artifact this was exported from is "Poetry بالعربي: Brand" in Claude.

## Rebuilding the viewer after changes

```sh
python3 design-review/design-refresh/tools/build_viewer.py
```

This reads `canvas/canvas.json` and every frame it lists, and writes a new `index.html`. It needs only Python 3. Pass a folder to build a different canvas, for example one in `archive/`.

## Notes

- English renderings of verses, the Arabic interface labels and several short Arabic poem names in these designs are working drafts. A native editor should confirm them before anything ships.
- The motion timings in S6 are proposed starting values and haven't been tested in a prototype.
