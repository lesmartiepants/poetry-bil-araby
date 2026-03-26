import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * TDD validation for WS4: Tone.js audio rewrite
 *
 * Validates that Tone.js is integrated into the audio pipeline,
 * toast.error is used for error notifications, and volume detection
 * uses Tone's analyser.
 */

const SRC = path.resolve(__dirname, '..');

describe('WS4: Tone.js integration', () => {
  describe('togglePlay.js uses Tone.js', () => {
    it('imports from tone', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/from\s*['"]tone['"]/);
    });

    it('uses Tone.start() for iOS unlock', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/(?:Tone\.)?start\s*\(/);
    });

    it('uses Tone.Player for playback', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/(?:new\s+)?(?:Tone\.)?Player/);
    });

    it('imports toast from sonner for error notifications', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/import\s*\{[^}]*toast[^}]*\}\s*from\s*['"]sonner['"]/);
    });

    it('calls toast.error for audio errors', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/toast\.error\s*\(/);
    });

    it('has future spatial audio comments', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/FUTURE.*(?:Transport|Panner|spatial)/i);
    });

    it('preserves cache pipeline', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/cacheOperations/);
    });

    it('preserves Sentry integration', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/Sentry/);
    });

    it('preserves in-flight dedup guard', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/isTogglingPlay/);
    });
  });

  describe('useVolumeDetection.jsx uses Tone analyser', () => {
    it('imports from tone', () => {
      const content = fs.readFileSync(path.join(SRC, 'hooks/useVolumeDetection.jsx'), 'utf-8');
      expect(content).toMatch(/from\s*['"]tone['"]/);
    });

    it('still exports PulseGlowBars component', () => {
      const content = fs.readFileSync(path.join(SRC, 'hooks/useVolumeDetection.jsx'), 'utf-8');
      expect(content).toMatch(/export\s+function\s+PulseGlowBars/);
    });

    it('still exports useVolumeDetection hook', () => {
      const content = fs.readFileSync(path.join(SRC, 'hooks/useVolumeDetection.jsx'), 'utf-8');
      expect(content).toMatch(/export\s+function\s+useVolumeDetection/);
    });
  });

  describe('audioStore.js has player field', () => {
    it('has player in store', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/audioStore.js'), 'utf-8');
      expect(content).toMatch(/player/);
    });

    it('still has error/setError for icon state', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/audioStore.js'), 'utf-8');
      expect(content).toMatch(/error/);
      expect(content).toMatch(/setError/);
    });
  });
});
