import PoemReader from '../components/feed/PoemReader.jsx';

// Seeded Arabic poem — no API required
const SEED_POEM = {
  id: 'seed-1',
  arabic:
    'أَلا لَيتَ الشَّبابَ يَعودُ يَوماً\nفَأُخبِرَهُ بِما فَعَلَ المَشيبُ\nتَمَنّى المَرءُ في الصِّبا طِوالاً\nفَلَمّا نالَهُ أَبكى وَخابا',
  english:
    'Oh, if only youth would return one day\nThat I might tell it what old age has done\nIn youth a man wishes for endless days\nBut when he gains them, weeps — the hope undone',
  poet: 'أبو تمام',
  title: 'شكوى الشيب',
};

export default {
  title: 'Feed/PoemReader',
  component: PoemReader,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0f0e0d' },
        { name: 'light', value: '#f5f0e8' },
      ],
    },
  },
  args: {
    poem: SEED_POEM,
    isActive: true,
    darkMode: true,
    showTranslation: true,
    showTransliteration: false,
    textScale: 1,
    currentFontClass: 'font-amiri',
    revealStyle: 'aurora',
  },
};

export const AuroraBloomDark = {
  name: 'Aurora Bloom — Dark',
  args: {
    darkMode: true,
    revealStyle: 'aurora',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

export const AuroraBloomLight = {
  name: 'Aurora Bloom — Light',
  args: {
    darkMode: false,
    revealStyle: 'aurora',
  },
  parameters: {
    backgrounds: { default: 'light' },
  },
};

export const WithoutTranslation = {
  name: 'Arabic Only (no translation)',
  args: {
    darkMode: true,
    showTranslation: false,
    revealStyle: 'aurora',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};

export const SimpleFade = {
  name: 'Simple Fade Style',
  args: {
    darkMode: true,
    revealStyle: 'simple',
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
};
