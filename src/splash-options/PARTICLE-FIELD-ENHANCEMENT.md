# Particle Field Enhancement

## Overview

Enhanced the Particle Field splash screen (`splash-particles.jsx`) with scholarly, poetic copy and a matching WalkthroughGuide that reinforces the particle theme.

## Changes Made

### 1. Enhanced Copy - Arabic Poetry Professor Voice

**Splash Screen Updates:**
- **Subtitle**: Changed from "Generative Arabic Verse" to "Verses Connecting Across Time and Space"
  - More philosophical and academic
  - Emphasizes interconnection through time

- **Interaction hint**: Changed from "Move to interact" to "Move your cursor to disturb the field"
  - Uses physics terminology ("disturb the field")
  - More poetic and intentional

### 2. New WalkthroughGuide Component

Created `ParticleWalkthroughGuide` component that matches the particle field aesthetic with:

#### Visual Design
- **Animated particle background**: 200 particles moving organically with noise-based physics
- **Connection lines**: Lines draw between nearby particles, creating a network effect
- **Progressive density**: Particle count increases with each step (25% → 50% → 75% → 100%)
- **Physics-based entrance**: Card slides in with spring-like easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- **Particle cluster icon**: Central node with 8 orbiting particles that light up progressively

#### Copy - Scholarly & Philosophical

**Step 1: Particles of Wisdom**
```
Like atoms forming molecules, verses coalesce into meaning—each word
a particle in the vast field of human experience, connecting poets
across centuries.
```

**Step 2: The Quantum Nature of Poetry**
```
Ancient scholars understood: poetry exists in superposition until
observed. Each reading collapses infinite meanings into one lived
moment of understanding.
```

**Step 3: Fields of Resonance**
```
Poets do not write in isolation. They disturb the field, sending
ripples through time. You feel echoes of verses written a millennium
ago, still vibrating.
```

**Step 4: The Interconnected Archive**
```
Navigate this living constellation. Each verse is a node, each poet
a gravitational center. Touch one, and you feel the pull of all
the others.
```

#### Arabic Translations
- ذرّات الحكمة (Particles of Wisdom)
- طبيعة الشعر الكمّية (The Quantum Nature of Poetry)
- حقول الرنين (Fields of Resonance)
- الأرشيف المترابط (The Interconnected Archive)

### 3. Design Features

#### Particle Effects
- Organic movement using simplex noise algorithm
- Particles form Arabic calligraphy (شعر - poetry)
- Interactive: particles repel from cursor movement
- Gentle pull back to original positions

#### Interconnection Theme
- Lines connect particles within 0.08 distance threshold
- Creates visual metaphor for how verses connect across time
- Network density increases with walkthrough progress

#### Progress Indicator
- Particle chain instead of traditional dots
- Particles light up as you progress
- Connection lines fill in between completed steps
- Active step has pulsing glow effect

#### Typography
- Maintains `font-brand-en` for English (clean, modern)
- Maintains `font-amiri` for Arabic (traditional, scholarly)
- Font weights: light (300) for academic tone
- Generous line-height for readability

#### Animation Timeline
```
0.0s: Card slides in (physics-based spring)
0.3s: Title fades in and scales up
0.5s: Description fades in and scales up
Continuous: Background particles animate
Continuous: Orbiting particles pulse
```

### 4. Technical Implementation

#### Component Structure
```
<ParticleWalkthroughGuide>
  ├─ Animated particle field background (SVG)
  │  ├─ 200 particles with organic movement
  │  └─ Connection lines between nearby particles
  │
  ├─ Content card
  │  ├─ Close button (X icon)
  │  ├─ Particle cluster icon (central + 8 orbiting)
  │  ├─ Step content (title + description)
  │  ├─ Progress indicator (particle chain)
  │  └─ Navigation buttons
  │
  └─ CSS animations (inline <style>)
```

#### State Management
- `localParticles`: 200 particles for background animation
- `timeRef`: Animation time counter
- `animationFrameRef`: RAF handle for cleanup
- Props: `onClose`, `darkMode`, `currentStep`, `onStepChange`

#### Performance
- Uses `requestAnimationFrame` for smooth 60fps animation
- Proper cleanup on unmount
- Efficient particle rendering (SVG circles)
- Connection lines computed only for nearby particles (optimization)

## Voice & Tone

### Before
- Generic: "Generative Arabic Verse"
- Simple: "Move to interact"
- No walkthrough specific to particle theme

### After
- Scholarly: "Verses Connecting Across Time and Space"
- Poetic: "Move your cursor to disturb the field"
- Physics metaphors: quantum, fields, resonance, gravitational centers
- Academic yet accessible: explains poetry through scientific metaphor
- Timeless: emphasizes connection across centuries

## Integration

The component is exported alongside `SplashParticles`:

```javascript
// Main splash screen
export const SplashParticles = ({ onGetStarted, darkMode, onToggleTheme }) => { ... }

// Matching walkthrough
export const ParticleWalkthroughGuide = ({ onClose, darkMode, currentStep, onStepChange }) => { ... }
```

Usage example (when integrated into main app):
```javascript
{showSplash && splashOption === 'particles' && (
  <SplashParticles
    onGetStarted={() => setShowWalkthrough(true)}
    darkMode={darkMode}
    onToggleTheme={toggleTheme}
  />
)}

{showWalkthrough && splashOption === 'particles' && (
  <ParticleWalkthroughGuide
    onClose={() => setShowWalkthrough(false)}
    darkMode={darkMode}
    currentStep={walkthroughStep}
    onStepChange={setWalkthroughStep}
  />
)}
```

## Philosophy

The enhancement transforms the particle field from a purely visual effect into a **philosophical metaphor**:

1. **Particles = Words**: Each particle represents a word or concept
2. **Connections = Meanings**: Lines between particles show how meanings emerge from connections
3. **Field = Archive**: The entire space represents the living archive of Arabic poetry
4. **Movement = Time**: Organic movement represents poetry flowing through centuries
5. **Disturbance = Reading**: Your interaction represents the act of reading and interpretation

This creates a cohesive experience where the visual design reinforces the conceptual message: **poetry is an interconnected field of wisdom that transcends time**.

## Dark/Light Mode Support

Both components fully support dark and light modes:
- Dark: White particles on black background
- Light: Black particles on white background
- Consistent with main app's stone-based color palette
- Smooth theme transitions

## Accessibility

- Keyboard navigation support for all interactive elements
- Proper button styling with hover states
- Clear visual feedback for progress
- Sufficient color contrast in both modes
- Touch-friendly button sizes (44px minimum)

## Files Modified

- `/src/splash-options/splash-particles.jsx` (expanded from 261 to 627 lines)
  - Enhanced copy in splash screen
  - Added `ParticleWalkthroughGuide` component
  - Added X icon import
  - Added CSS animations

## Next Steps

1. Test in browser with both dark and light modes
2. Verify particle animation performance on different devices
3. Test walkthrough flow (all 4 steps)
4. Ensure smooth transitions between splash and walkthrough
5. Consider adding to mockup gallery for visual review
