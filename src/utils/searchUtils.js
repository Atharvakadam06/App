export function matchSearch(text, query) {
  if (!query) return true;
  if (!text) return false;

  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return true;

  const terms = cleanQuery.split(/\s+/);
  const cleanText = text.toLowerCase();

  return terms.every(term => {
    // 1. Exact start matching in the whole string
    if (cleanText.startsWith(term)) return true;

    // 2. Starts with '@' (usernames)
    if (cleanText.startsWith('@' + term)) return true;

    // 3. Match at any word boundary or after separators like _, -, /
    let index = cleanText.indexOf(term);
    while (index !== -1) {
      if (index === 0) return true;
      const charBefore = cleanText[index - 1];
      if (
        charBefore === ' ' ||
        charBefore === '@' ||
        charBefore === '_' ||
        charBefore === '-' ||
        charBefore === '/' ||
        charBefore === '(' ||
        charBefore === '['
      ) {
        return true;
      }
      index = cleanText.indexOf(term, index + 1);
    }
    return false;
  });
}
