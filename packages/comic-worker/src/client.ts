import * as Comlink from "comlink";
import type { ComicWorkerApi } from "./comic-worker.js";

export type ComicWorkerClient = Comlink.Remote<ComicWorkerApi> & {
  /** Terminate the underlying Worker. */
  terminate(): void;
};

export interface CreateComicWorkerClientOptions {
  /** Worker module name; defaults to "comic-worker". */
  name?: string;
  /** Custom WorkerOptions; defaults to `{ type: "module" }`. */
  workerOptions?: WorkerOptions;
}

/**
 * Spawn a Worker from `workerUrl` and wrap it with Comlink so callers can
 * await `client.openComic(...)` etc. as if the API were local.
 *
 * `workerUrl` should typically be produced via `new URL("./worker.ts", import.meta.url)`
 * by the host bundler so the worker entry resolves correctly.
 */
export function createComicWorkerClient(
  workerUrl: string | URL,
  opts: CreateComicWorkerClientOptions = {},
): ComicWorkerClient {
  const worker = new Worker(workerUrl, {
    type: "module",
    name: opts.name ?? "comic-worker",
    ...opts.workerOptions,
  });
  const remote = Comlink.wrap<ComicWorkerApi>(worker);
  const client = remote as ComicWorkerClient;
  client.terminate = () => {
    worker.terminate();
  };
  return client;
}
