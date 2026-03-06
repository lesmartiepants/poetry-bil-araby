# Design System Spec — poetry-bil-araby

Project-specific design specifications for controls, onboarding, mobile, and design diversity tracking.

---

## Vertical Toggle Controls

4-toggle strip on the right side of the screen. Each E2E design file should include these as a vertical strip styled to match the design's visual philosophy.

| Toggle | States | Icon/Label | Purpose |
|--------|--------|------------|---------|
| Translation | On/Off | `ع\|A` (Arabic ain + English A) | Toggle between Arabic original and English translation |
| Transliteration | On/Off | Phonetic/abc icon | Show romanized pronunciation inline after each Arabic verse line |
| Text Size | Cycle: S → M → L → XL | `Aa` | Cycle through 4 font sizes |
| Settings | Open/Close | Gear icon | Open settings panel |

**Styling requirements:**
- Match the design's visual philosophy (controls should feel native to each design, not generic)
- Vertical strip layout on right edge of viewport
- Responsive: collapse, reposition, or adapt on viewports < 428px
- 44px minimum touch target per toggle
- Active state clearly differentiated from inactive
- The translation icon MUST be `ع|A` — NOT Chinese characters, NOT a generic globe/translate icon

## Horizontal Action Controls

Bottom bar with action buttons. Present in the main app view.

| Action | Icon | Behavior |
|--------|------|----------|
| Listen | Speaker/Audio | Play audio synthesis of the poem (Gemini multimodal) |
| Save | Bookmark/Heart | Save current poem to favorites |
| Explain/Insights | Lightbulb/Star | Show AI-generated explanation of the poem |
| Next | Arrow right | Load next poem |
| Shuffle/Random | Dice/Shuffle | Load random poem |
| Poet | Person/Quill | Show poet info or filter by poet |

**Styling requirements:**
- Horizontal layout at bottom of viewport
- Philosophy-matched styling (each design's action bar should reflect its metaphor)
- `padding-bottom: env(safe-area-inset-bottom)` for notched devices
- Icons recognizable at 20px size
- 44px minimum touch target per button
- No horizontal overflow at 375px viewport

## Onboarding Requirements

Every E2E design has a splash screen and 2-4 onboarding steps before the main app.

- **Progression**: Tap-anywhere on the step area OR "Next" button to advance
- **No skip/close**: No X buttons, no "Skip" links — forward-only progression
- **Final step transition**: Last onboarding step adds `.app.active` (or equivalent) class to reveal the main app
- **Philosophy-specific**: Onboarding should showcase the design's best qualities:
  - PF1 Calligraphic: Letter-by-letter kinetic reveals
  - LS2 Ray Tracing: Light beams sweep across content
  - 09 Scandinavian Scroll: Minimalist fade-in with generous whitespace
- **Step count**: 2-4 steps (concise, not overwhelming)
- **Content**: Brief explanation of what the app does + how to interact

## Mobile Requirements

- **Primary viewport**: 375-428px (iPhone SE through iPhone 15 Pro Max)
- **Touch targets**: 44px minimum (both width and height)
- **Safe area**: `padding-bottom: env(safe-area-inset-bottom)` on all bottom-positioned elements
- **No horizontal overflow**: Test at 375px — if any content overflows, redesign (don't just hide overflow)
- **Font sizing**: Use `clamp(min, preferred, max)` for fluid typography
- **Controls at narrow widths**: Must be usable without overlapping or truncation
- **Scroll behavior**: Vertical scroll only on main content. No unexpected horizontal scroll.

## Transliteration Display

- Show inline after each Arabic verse line (not as a separate block)
- Smaller font size than the Arabic text
- Muted color (lower contrast than primary text)
- Italic style to distinguish from translation
- Example layout:
  ```
  قِفا نَبكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ
  qifā nabki min dhikrā ḥabībin wa-manzili

  بِسِقطِ اللِوى بَينَ الدَخولِ فَحَومَلِ
  bisiqṭi l-liwā bayna d-dukhūli fa-ḥawmali
  ```

## Design Diversity Matrix

Tracks coverage across philosophy axes to prevent duplication in future rounds.

| Design | Set | Cultural Ref | Material Metaphor | Interaction Model | Emotional Register |
|--------|-----|-------------|-------------------|-------------------|-------------------|
| PF1 Calligraphic | gen-3 | Islamic calligraphy | Ink/paper | Kinetic typography | Contemplative |
| PF2 Gold Mystical | gen-3 | Middle Eastern mysticism | Gold/jewels | Particle effects | Mystical |
| PF3 Ink Constellation | gen-3 | Astronomy/astrology | Starfield/ink | Constellation drawing | Wonder |
| Zen1 Refined | gen-3 | Japanese zen | Stone/bamboo | Minimal tap | Serene |
| Zen2 Haiku | gen-3 | Japanese haiku | Paper/brush | Circle meditation | Meditative |
| LS1 Chiaroscuro | gen-3 | Renaissance art | Light/shadow | Dramatic reveal | Dramatic |
| LS2 Ray Tracing | gen-3 | Modern optics | Light beams | Light-as-UI controls | Futuristic |
| Codex Spine Story | gen-3 | Medieval codex | Leather/vellum | 3D page turn | Scholarly |
| A1 Gold Orbit Story | gen-1 | Orbital mechanics | Gold rings | Orbit navigation | Cosmic |
| A2 Editorial Magazine | gen-1 | Print journalism | Paper/type | Magazine flip | Sophisticated |
| A8 Deco Discovery | gen-1 | Art Deco | Chrome/glass | Geometric reveal | Glamorous |
| B10 Signature Blend | gen-1 | Tessellation art | Tile/mosaic | Pattern assembly | Creative |
| B8 Japanese Ma | gen-1 | Japanese Ma (space) | Void/negative space | Silence-driven | Minimal |
| 02 Zen Manuscript | gen-2a | Zen Buddhism | Scroll/parchment | Unrolling scroll | Peaceful |
| 04 Neumorphic Warmth | gen-2a | Modern digital | Soft plastic | Neumorphic press | Warm |
| 07 Illuminated Manuscript | gen-2a | Medieval illumination | Gold leaf/vellum | Ornamental reveal | Sacred |
| 09 Scandinavian Scroll | gen-2a | Nordic minimalism | Wood/stone | Gentle scroll | Calm |
| 01 Particle Scroll | gen-2b | Digital particles | Energy/data | Particle flow | Dynamic |
| 04 Islamic Geometric | gen-2b | Islamic geometry | Tile/glass | Pattern growth | Intricate |
| 05 Codex Page Turn | gen-2b | Book binding | Paper/leather | Page turn | Tactile |
| 07 Particle Neumorphic | gen-2b | Hybrid digital | Soft + particles | Neumorphic + flow | Ethereal |
| 08 Zen Spotlight | gen-2b | Stage lighting | Spotlight/void | Spotlight reveal | Focused |
| 09 Kinetic Typography | gen-2b | Typographic art | Pure letterforms | Kinetic text | Expressive |

### Coverage Gaps (for future rounds)

Missing axes to explore:
- **Cultural**: African, South American, Southeast Asian, Celtic
- **Material**: Water/liquid, fabric/textile, clay/ceramic
- **Interaction**: Voice-driven, gesture-based, physics simulation
- **Emotional**: Playful/humorous, nostalgic, rebellious/punk
