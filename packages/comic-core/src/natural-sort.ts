/**
 * Numeric-aware comparator so that "p2.jpg" < "p10.jpg".
 * Locale-insensitive: does byte/codepoint comparison on non-numeric runs.
 */
export function naturalCompare(a: string, b: string): number {
  if (a === b) return 0;
  const re = /(\d+)|(\D+)/g;
  const aParts = a.match(re) ?? [];
  const bParts = b.match(re) ?? [];
  const len = Math.min(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const ap = aParts[i]!;
    const bp = bParts[i]!;
    const aIsNum = /^\d+$/.test(ap);
    const bIsNum = /^\d+$/.test(bp);

    if (aIsNum && bIsNum) {
      // Compare as integers; fall back to string compare if equal numerically
      // so that "01" sorts before "1".
      const an = Number(ap);
      const bn = Number(bp);
      if (an !== bn) return an < bn ? -1 : 1;
      if (ap.length !== bp.length) return ap.length < bp.length ? -1 : 1;
    } else if (aIsNum !== bIsNum) {
      // Numeric runs sort before alpha runs.
      return aIsNum ? -1 : 1;
    } else {
      if (ap < bp) return -1;
      if (ap > bp) return 1;
    }
  }

  if (aParts.length !== bParts.length) {
    return aParts.length < bParts.length ? -1 : 1;
  }
  return 0;
}

export function naturalSortBy<T>(items: T[], key: (t: T) => string): T[] {
  return items
    .map((item, index) => ({ item, index, k: key(item) }))
    .sort((a, b) => {
      const c = naturalCompare(a.k, b.k);
      return c !== 0 ? c : a.index - b.index;
    })
    .map((entry) => entry.item);
}
