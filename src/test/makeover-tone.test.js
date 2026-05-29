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

  describe('iOS silent switch bypass', () => {
    it('audio.js exports unlockAudioForIOS as an async function', () => {
      const content = fs.readFileSync(path.join(SRC, 'utils/audio.js'), 'utf-8');
      // Must be async so callers can await session promotion before resuming AudioContext
      expect(content).toMatch(/export\s+async\s+function\s+unlockAudioForIOS/);
    });

    it('audio.js awaits audio.play() so session promotion completes before returning', () => {
      const content = fs.readFileSync(path.join(SRC, 'utils/audio.js'), 'utf-8');
      expect(content).toMatch(/await\s+audio\.play\s*\(\)/);
    });

    it('audio.js contains a silent WAV base64 constant', () => {
      const content = fs.readFileSync(path.join(SRC, 'utils/audio.js'), 'utf-8');
      expect(content).toMatch(/SILENT_WAV_BASE64/);
    });

    it('togglePlay.js imports unlockAudioForIOS from utils/audio', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(/unlockAudioForIOS/);
    });

    it('togglePlay.js awaits unlockAudioForIOS in both RESUME and GENERATE paths', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      // Collect positions of all `await unlockAudioForIOS()` and `await toneStart()` calls
      const awaitedUnlockPositions = [];
      const toneStartPositions = [];
      let pos = 0;
      while ((pos = content.indexOf('await unlockAudioForIOS()', pos)) !== -1) {
        awaitedUnlockPositions.push(pos);
        pos++;
      }
      pos = 0;
      while ((pos = content.indexOf('await toneStart()', pos)) !== -1) {
        toneStartPositions.push(pos);
        pos++;
      }
      // Both the RESUME path and the GENERATE path must have an awaited unlock before toneStart
      expect(awaitedUnlockPositions.length).toBeGreaterThanOrEqual(2);
      expect(toneStartPositions.length).toBeGreaterThanOrEqual(2);
      // Each toneStart must be preceded by an awaited unlockAudioForIOS
      for (const toneIdx of toneStartPositions) {
        const precedingAwaitedUnlock = awaitedUnlockPositions.some((u) => u < toneIdx);
        expect(
          precedingAwaitedUnlock,
          `await toneStart() at position ${toneIdx} has no preceding await unlockAudioForIOS()`
        ).toBe(true);
      }
    });

    describe('unlockAudioForIOS unit tests', () => {
      let originalCreateElement;
      let mockPlay;
      let mockAudio;

      beforeEach(() => {
        mockPlay = vi.fn().mockResolvedValue(undefined);
        mockAudio = { src: '', volume: 1, play: mockPlay };
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

      it('sets volume to 1 (full, not near-zero) for reliable session promotion', async () => {
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await unlockAudioForIOS();
        expect(mockAudio.volume).toBe(1);
      });

      it('does not throw if audio.play() rejects (e.g. no user gesture)', async () => {
        mockPlay.mockRejectedValue(new DOMException('NotAllowedError'));
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await expect(unlockAudioForIOS()).resolves.not.toThrow();
      });
    });
  });
});
