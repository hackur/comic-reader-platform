// Re-export the web-standard types via aliases so they can be imported from
// this module ergonomically alongside `linkSignals`.
export type ComicAbortSignal = AbortSignal;
export type ComicAbortController = AbortController;

/**
 * Combine multiple AbortSignals into a single signal that aborts as soon as
 * any input aborts. Filters out null/undefined inputs for convenience.
 */
export function linkSignals(...signals: Array<AbortSignal | null | undefined>): AbortSignal {
  const real = signals.filter((s): s is AbortSignal => !!s);

  // Prefer the platform-native combinator when available.
  const anyAbort = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof anyAbort === "function") {
    return anyAbort(real);
  }

  const controller = new AbortController();

  for (const s of real) {
    if (s.aborted) {
      controller.abort(s.reason);
      return controller.signal;
    }
  }

  const onAbort = (event: Event) => {
    const target = event.target as AbortSignal;
    controller.abort(target.reason);
    for (const s of real) {
      s.removeEventListener("abort", onAbort);
    }
  };

  for (const s of real) {
    s.addEventListener("abort", onAbort, { once: true });
  }

  return controller.signal;
}
