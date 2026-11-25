// Types for guide.js (plain JavaScript so the server can import it).
import type { Prefs } from '../types';

/** A poem as the server reads it; the mock maps its fixtures to the same shape. */
export interface GuideRow {
  id: string | number;
  title?: string;
  title_en?: string;
  poet_id: string | number;
  poet_en: string;
  era_id?: string | number | null;
  era_key?: string | null;
  mood_primary?: string | null;
  feeling_keys?: string[];
  arabic?: string;
  accessibility_score?: number | null;
  birth_year?: number | null;
  death_year?: number | null;
  active_year?: number | null;
}
export interface Steer {
  cm: number | null;
  difficulty: 'any' | 'gentle' | 'measured' | 'demanding';
  length: 'any' | 'short' | 'long';
  feelings: string[];
}
export type DoorKind = 'full' | 'feeling' | 'poet' | 'era' | 'new';
type BandOf = (score: number | null | undefined, row: GuideRow) => string;

export const ERA_NAMES: Record<string, string>;
export function yearOf(r: GuideRow): number | null;
export function steerQuery(prefs: Prefs | undefined): string;
export function parseSteer(q?: Record<string, string | undefined>): Steer;
export function guideScore(r: GuideRow, steer: Steer, bandOf?: BandOf): number;
export function byFit<T extends GuideRow>(rows: T[], steer: Steer, bandOf?: BandOf): T[];
export function doorPools<T extends GuideRow>(me: T, near: T[], anywhere: T[], full?: T | null): Record<DoorKind, T[] | T | null>;
export function chooseDoors<T extends GuideRow>(me: T, pools: Partial<Record<DoorKind, T[] | T | null>>, n?: number): { kind: DoorKind; row: T }[];
export function doorWords(kind: DoorKind, me: GuideRow, r: GuideRow, mood: string | null, nth?: number): { hook: string; reason: string };
export function wordDoors<T extends GuideRow>(chosen: { kind: DoorKind; row: T }[], me: GuideRow, mood: string | null): { kind: DoorKind; row: T; hook: string; reason: string }[];
export function uniqueHooks<D extends { hook: string; poem: { poetEn: string; titleEn: string } }>(doors: D[]): D[];
export function cleanDoorText(x: unknown): { hook: string; reason: string } | null;
