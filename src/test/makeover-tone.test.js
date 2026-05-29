import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  // ─── TDD: iOS silent switch bypass ────────────────────────────────────────
  // These tests are written BEFORE the implementation exists (red phase).
  // They define the exact contract for unlockAudioForIOS and the togglePlay
  // changes required to bypass the iOS hardware silent switch.
  describe('iOS silent switch bypass', () => {
    // ── Static contract tests ──────────────────────────────────────────────

    it('audio.js exports unlockAudioForIOS as an async function', () => {
      const content = fs.readFileSync(path.join(SRC, 'utils/audio.js'), 'utf-8');
      expect(content).toMatch(/export\s+async\s+function\s+unlockAudioForIOS/);
    });

    it('audio.js guards audio.play() against hang via Promise.race timeout', () => {
      // audio.play() can hang indefinitely on some iOS versions; a timeout
      // ensures the caller always proceeds within a bounded time.
      const content = fs.readFileSync(path.join(SRC, 'utils/audio.js'), 'utf-8');
      expect(content).toMatch(/Promise\.race/);
    });

    it('togglePlay.js imports and awaits unlockAudioForIOS in both paths', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      // Must appear at least twice: once for RESUME, once for GENERATE
      const matches = content.match(/await\s+unlockAudioForIOS\s*\(/g) || [];
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });

    it('togglePlay.js guards toneStart() with a Promise.race timeout', () => {
      // AudioContext.resume() can hang indefinitely on iOS — a timeout prevents
      // isTogglingPlay.current from being permanently locked on the first tap.
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/Promise\.race/);
      // toneStart() must be one of the race participants
      expect(content).toMatch(/toneStart\s*\(\s*\)/);
    });

    // ── Behavioural unit tests for unlockAudioForIOS ───────────────────────

    describe('unlockAudioForIOS unit tests', () => {
      let mockPlay;
      let mockAudio;
      let originalCreateElement;

      beforeEach(() => {
        mockPlay = vi.fn().mockResolvedValue(undefined);
        mockAudio = { setAttribute: vi.fn(), play: mockPlay, src: '' };
        originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, 'createElement').mockImplementation((tag) => {
          if (tag === 'audio') return mockAudio;
          return originalCreateElement(tag);
        });
      });

      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('calls audio.play() during unlock', async () => {
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await unlockAudioForIOS();
        expect(mockPlay).toHaveBeenCalledTimes(1);
      });

      it('sets src to a WAV data URI', async () => {
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await unlockAudioForIOS();
        expect(mockAudio.src).toMatch(/^data:audio\/wav;base64,/);
      });

      it('sets playsinline so iOS does not go fullscreen', async () => {
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await unlockAudioForIOS();
        expect(mockAudio.setAttribute).toHaveBeenCalledWith('playsinline', '');
      });

      it('does not throw if audio.play() rejects (e.g. no user gesture)', async () => {
        mockPlay.mockRejectedValue(new DOMException('NotAllowedError'));
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await expect(unlockAudioForIOS()).resolves.toBeUndefined();
      });

      it('resolves within timeout even if audio.play() never settles', async () => {
        // Simulates the iOS WebKit bug where play() hangs indefinitely
        mockPlay.mockImplementation(() => new Promise(() => {}));
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        // Should resolve in ~1.5s; allow 3s to avoid flakiness
        await expect(unlockAudioForIOS()).resolves.toBeUndefined();
      }, 3000);
    });
  });
});
