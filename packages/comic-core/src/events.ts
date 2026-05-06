import type { ComicError } from "./errors.js";

export interface ProgressEvent {
  loaded: number;
  total?: number;
  phase: string;
}

export interface PageReadyEvent {
  index: number;
}

export interface ComicEventMap {
  progress: ProgressEvent;
  pageReady: PageReadyEvent;
  error: ComicError;
}

type Listener<T> = (detail: T) => void;

/**
 * Tiny typed event emitter. Avoids depending on DOM EventTarget so it works
 * in workers and Node alike.
 */
export class TypedEventTarget<T extends Record<string, unknown>> {
  private readonly listeners: { [K in keyof T]?: Set<Listener<T[K]>> } = {};

  on<K extends keyof T>(type: K, listener: Listener<T[K]>): () => void {
    let set = this.listeners[type];
    if (!set) {
      set = new Set();
      this.listeners[type] = set;
    }
    set.add(listener);
    return () => this.off(type, listener);
  }

  off<K extends keyof T>(type: K, listener: Listener<T[K]>): void {
    this.listeners[type]?.delete(listener);
  }

  once<K extends keyof T>(type: K, listener: Listener<T[K]>): () => void {
    const off = this.on(type, (detail) => {
      off();
      listener(detail);
    });
    return off;
  }

  emit<K extends keyof T>(type: K, detail: T[K]): void {
    const set = this.listeners[type];
    if (!set) return;
    // Snapshot to avoid mutation-during-iteration issues.
    for (const listener of [...set]) {
      try {
        listener(detail);
      } catch {
        // Listeners must not break the emit loop.
      }
    }
  }

  removeAllListeners<K extends keyof T>(type?: K): void {
    if (type === undefined) {
      for (const key of Object.keys(this.listeners) as Array<keyof T>) {
        this.listeners[key]?.clear();
      }
    } else {
      this.listeners[type]?.clear();
    }
  }
}

// Index signature satisfaction wrapper so ComicEventMap can be used as the
// generic argument despite having a closed set of event names.
type EventMapShape<T> = { [K in keyof T]: T[K] } & Record<string, unknown>;
export class ComicEventEmitter extends TypedEventTarget<EventMapShape<ComicEventMap>> {}
