# Archive · earlier Claude Design canvases

The canvases that came before the design refresh, in the order they were made. Each folder works like the main one: open its `index.html` in a browser, and its `canvas/` folder is an exact copy of that artifact's `project/` files, so it can be re-imported into Claude the same way (see the main README).

| Folder | Canvas | What's in it |
| --- | --- | --- |
| `01-redesign-directions/` | Poetry بالعربي: 5 redesign directions | The first explorations (Folio, Gallery, Ink, Majlis) and the v2 principal redesign: directions, edge cases, flow and spec. Two pages. |
| `02-reader-concepts/` | Poetry بالعربي: 10 Reader Concepts | Ten reader concepts (reading, listening, tap a word, insights as marginalia, library, share, memorize, settings) plus early brand, letterform and pattern studies. |
| `03-finalists/` | Poetry بالعربي: Finalists | The brand finalists: logo and lockups, Ruqah and Kufi type studies, type roles, icons, and the finalist app screens in Heavens, Interlace and Seal. |

To rebuild one viewer after changing its canvas:

```
python3 design-review/design-refresh/tools/build_viewer.py design-review/design-refresh/archive/02-reader-concepts
```
