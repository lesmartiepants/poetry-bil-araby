// Types for shareCard.js (plain JavaScript so the server can import it).

export interface Colourway {
  key: string;
  name: string;
  bg: string;
  frame: string;
  title: string;
  ink: string;
}

export interface CardSpec {
  titleAr: string;
  titleEn: string;
  poetAr: string;
  poetEn: string;
  lines: { ar: string; en?: string }[];
  showEn: boolean;
  colourway: string;
  dedication?: string;
  /** Printed in the footer of saved images, e.g. "bilaraby.app/p/amurru". */
  link?: string;
  card?: { index: number; of: number };
}

export const COLOURWAYS: Colourway[];
export const RECIPIENTS: string[];
export const CARD_W: number;
export const CARD_H: number;
export const EXPORT_W: number;
export function splitForCards(lineCount: number): number[];
export function cardsFor(lineIndexes: number[]): number[][];
export function layoutCard(
  spec: CardSpec,
  opts?: { preview?: boolean }
): { ar: number; en: number; long: boolean };
export function cardSvg(
  spec: CardSpec,
  opts?: { width?: number; rounded?: boolean; preview?: boolean }
): string;
