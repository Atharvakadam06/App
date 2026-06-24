/**
 * matchSearch — strict substring search.
 * Returns true only if the query appears as a contiguous substring in the text (case-insensitive).
 * All terms in the query must match (AND logic).
 */
export function matchSearch(text, query) {
  if (!query) return true;
  if (!text) return false;

  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return true;

  const terms = cleanQuery.split(/\s+/);
  const cleanText = text.toLowerCase();

  // Every term in the query must appear somewhere in the text
  return terms.every(term => cleanText.includes(term));
}
