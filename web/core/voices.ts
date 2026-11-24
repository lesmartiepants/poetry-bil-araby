// The voice catalogue (today's src/constants/voices.js, active voices only),
// under Gemini names, grouped Female and Male (3.3, 12.6).
import type { Voice } from './types';

export const VOICES: Voice[] = [
  { name: 'Zephyr', descriptor: 'Bright', gender: 'f' },
  { name: 'Leda', descriptor: 'Youthful', gender: 'f' },
  { name: 'Aoede', descriptor: 'Breezy', gender: 'f' },
  { name: 'Autonoe', descriptor: 'Bright', gender: 'f' },
  { name: 'Laomedeia', descriptor: 'Upbeat', gender: 'f' },
  { name: 'Pulcherrima', descriptor: 'Forward', gender: 'f' },
  { name: 'Vindemiatrix', descriptor: 'Gentle', gender: 'f' },
  { name: 'Sulafat', descriptor: 'Warm', gender: 'f' },
  { name: 'Orus', descriptor: 'Firm', gender: 'm' },
  { name: 'Charon', descriptor: 'Informative', gender: 'm' },
  { name: 'Enceladus', descriptor: 'Breathy', gender: 'm' },
  { name: 'Iapetus', descriptor: 'Clear', gender: 'm' },
  { name: 'Algieba', descriptor: 'Smooth', gender: 'm' },
  { name: 'Algenib', descriptor: 'Gravelly', gender: 'm' },
  { name: 'Alnilam', descriptor: 'Firm', gender: 'm' },
  { name: 'Zubenelgenubi', descriptor: 'Casual', gender: 'm' },
];
export const FEMALE_VOICES = VOICES.filter((v) => v.gender === 'f');
export const MALE_VOICES = VOICES.filter((v) => v.gender === 'm');
