/**
 * Normalize common PDF copy/paste artifacts for display.
 *
 * Most PDFs insert soft line breaks and hyphenation at end-of-line:
 *   "sci-\nentific"  -> "scientific"
 *   "pub-\nlished"   -> "published"
 *
 * We only de-hyphenate when a hyphen is immediately followed by a newline
 * and both sides are letters. We do NOT remove normal paragraph newlines.
 */
export function normalizePdfHyphenation(text: string): string {
  if (!text) return text;

  // Join hyphenated line-breaks inside words: "multi-\ndisciplinary" -> "multidisciplinary"
  // Covers ASCII letters and basic Latin extended letters.
  return text.replace(
    /([A-Za-zÀ-ÖØ-öø-ÿ])-\r?\n([A-Za-zÀ-ÖØ-öø-ÿ])/g,
    '$1$2',
  );
}

