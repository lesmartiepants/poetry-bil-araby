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

    it('togglePlay.js awaits unlockAudioForIOS and calls toneStart in both RESUME and GENERATE paths', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      // Both RESUME and GENERATE paths must await unlockAudioForIOS before toneStart
      const awaitedUnlockMatches = content.match(/await\s+unlockAudioForIOS\s*\(/g) || [];
      const toneStartMatches = content.match(/toneStart\s*\(\s*\)/g) || [];
      expect(awaitedUnlockMatches.length).toBeGreaterThanOrEqual(2);
      expect(toneStartMatches.length).toBeGreaterThanOrEqual(2);
    });

    it('togglePlay.js guards toneStart() against iOS AudioContext hang via Promise.race timeout', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      // toneStart() is wrapped in Promise.race so a stuck AudioContext.resume() can't
      // permanently lock isTogglingPlay.current — a known iOS WebKit bug.
      expect(content).toMatch(/Promise\.race\s*\(\s*\[/);
      expect(content).toMatch(/toneStart\s*\(\s*\).*setTimeout|setTimeout.*toneStart\s*\(\s*\)/s);
    });

    it('audio.js guards audio.play() against hang via Promise.race timeout', () => {
      const content = fs.readFileSync(path.join(SRC, 'utils/audio.js'), 'utf-8');
      expect(content).toMatch(/Promise\.race\s*\(\s*\[/);
      expect(content).toMatch(/audio\.play\s*\(\s*\).*setTimeout|setTimeout.*audio\.play/s);
    });

    it('togglePlay.js passes getToneContext().rawContext to unlockAudioForIOS', () => {
      const content = fs.readFileSync(path.join(SRC, 'stores/actions/togglePlay.js'), 'utf-8');
      expect(content).toMatch(
        /unlockAudioForIOS\s*\(\s*getToneContext\s*\(\s*\)\s*\.\s*rawContext\s*\)/
      );
    });

    describe('unlockAudioForIOS unit tests', () => {
      let mockPlay;
      let mockAudio;
      let originalCreateElement;

      beforeEach(() => {
        mockPlay = vi.fn().mockResolvedValue(undefined);
        mockAudio = { setAttribute: vi.fn(), src: '', play: mockPlay };
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

      it('sets playsinline attribute so iOS does not go fullscreen', async () => {
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await unlockAudioForIOS();
        expect(mockAudio.setAttribute).toHaveBeenCalledWith('playsinline', '');
      });

      it('connects the audio element to the AudioContext via createMediaElementSource', async () => {
        const mockSource = { connect: vi.fn() };
        const mockDestination = {};
        const mockAudioContext = {
          createMediaElementSource: vi.fn().mockReturnValue(mockSource),
          destination: mockDestination,
        };
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await unlockAudioForIOS(mockAudioContext);
        expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(mockAudio);
        expect(mockSource.connect).toHaveBeenCalledWith(mockDestination);
      });

      it('skips createMediaElementSource when no audioContext is provided', async () => {
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await expect(unlockAudioForIOS(undefined)).resolves.toBeUndefined();
        expect(mockPlay).toHaveBeenCalledTimes(1);
      });

      it('does not throw if audio.play() rejects (e.g. no user gesture)', async () => {
        mockPlay.mockRejectedValue(new DOMException('NotAllowedError'));
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await expect(unlockAudioForIOS()).resolves.not.toThrow();
      });

      it('does not throw if createMediaElementSource throws', async () => {
        const mockAudioContext = {
          createMediaElementSource: vi.fn().mockImplementation(() => {
            throw new DOMException('InvalidStateError');
          }),
          destination: {},
        };
        const { unlockAudioForIOS } = await import('../utils/audio.js');
        await expect(unlockAudioForIOS(mockAudioContext)).resolves.toBeUndefined();
        // audio.play() must still be called even when the AudioContext wiring fails
        expect(mockPlay).toHaveBeenCalledTimes(1);
      });
    });
  });
});
