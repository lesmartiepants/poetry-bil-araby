/**
 * sparkler — shared constants/helpers for the sparkler reveal canvas.
 */

/** Shiny gold → white-hot spark palette (no amber/ember/multicolour). */
export const SPARK_COLORS = ['#ffffff', '#fff6da', '#ffe6a3', '#ffd277', '#e9c069'];

/** Western digits → Arabic-Indic numerals (e.g. 12 → ١٢). */
export const arNum = (n) =>
  String(n)
    .split('')
    .map((d) => '٠١٢٣٤٥٦٧٨٩'[+d] ?? d)
    .join('');
