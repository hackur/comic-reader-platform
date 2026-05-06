# Security

This document covers the threat model, the boundaries the platform relies on, the CSP we recommend, and how to report a vulnerability.

## Threat model basics

The Comic Reader Platform is a local-first browser app. The threats it cares about, in rough order of severity:

| Threat | Mitigation |
| --- | --- |
| Malicious archive crashes the tab. | Extractors run lazily and report `CORRUPT_ARCHIVE` on parse failure; long extraction work happens in a Web Worker so a crash doesn't take the UI with it. |
| Malicious archive achieves code execution. | No archive content is ever `eval`'d, `new Function`'d, or rendered as HTML. Pages are only ever loaded as `<img src="blob:...">`. |
| Malicious archive exfiltrates data. | Blobs live behind `URL.createObjectURL` (same-origin only) and the page never makes outbound `fetch` on archive contents. CSP blocks unintended outbound requests. |
| Cross-origin script reads library. | IndexedDB and OPFS are origin-scoped by the browser; no cross-origin reads are possible without the user installing the same site at the same origin. |
| Compromised dependency exfiltrates user content. | Lock file pinning, `pnpm audit`, no telemetry endpoints to abuse. Periodic dependency review. |
| User pastes a hostile URL. | `kind: "url"` sources go through `fetch`; CSP `connect-src` should be restrictive. |

What is **not** in scope:

- Defending against an attacker who controls the user's machine.
- Defending against a malicious browser extension running in the same origin.
- Defending against the operating system.

## Boundaries we rely on

- **Same-origin policy.** IndexedDB, OPFS, and `blob:` URLs are origin-scoped. The platform inherits this for free.
- **Web Worker isolation.** `comic-worker` runs in a Worker. Workers do not share the DOM, do not share `localStorage`, and crash independently of the main thread. Archive parsing in a Worker means a malformed archive that triggers a runaway loop or an OOM in `libarchive.js` cannot lock the UI.
- **PDF.js sandbox.** `pdfjs-dist` runs JavaScript inside PDFs in its own sandbox. We do not enable PDF JavaScript in v1; if you do enable it, you opt into PDF.js's threat model.
- **WebAssembly memory isolation.** `libarchive.js` runs as WASM. WASM linear memory is sandboxed from the JS heap; a parsing bug cannot read arbitrary JS objects.

## Recommended Content Security Policy

For a static deployment of `apps/web`, this is a reasonable baseline. Tighten as your deployment allows.

```
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
media-src 'self' blob:;
connect-src 'self';
worker-src 'self' blob:;
child-src 'self' blob:;
font-src 'self';
object-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

Notes on each directive:

- `'wasm-unsafe-eval'` is required by `libarchive.js` and modern browsers. The legacy `'unsafe-eval'` should *not* be added.
- `'unsafe-inline'` for styles is a Tailwind 4 reality; use a hashed strict-dynamic style policy if you can.
- `img-src blob:` is required for page rendering. `data:` is for small inline icons and is optional.
- `connect-src 'self'` blocks accidental beacons. If you allow `kind: "url"` archive imports from arbitrary hosts, you will need to relax this — preferably to a user-controlled allowlist, not `*`.
- `worker-src` and `child-src` cover both the comic worker and any chunk-loaded workers.
- `frame-ancestors 'none'` prevents clickjacking.

If you deploy to Cloudflare Pages, set these via `_headers` at the root of `apps/web/public/`.

## PDF.js sandboxing

`pdfjs-dist` ships its own worker (`pdf.worker.min.mjs`). The viewer keeps that worker:

- Self-hosted (do not load from a CDN).
- Loaded from a known URL configured at startup via `configurePdfWorker()`.
- Subject to `worker-src 'self'`.

Do not enable `pdfjs.AppOptions.set('isEvalSupported', true)` or PDF JavaScript execution. The platform default is to leave both off.

## RAR worker isolation

`@comics-platform/comic-extractor-rar` uses `libarchive.js`, which spins up its own Worker for RAR decoding. That Worker:

- Is self-hosted, not loaded from a CDN.
- Receives the archive blob via `postMessage` and returns extracted entries the same way.
- Has no DOM access.
- Has no IndexedDB / OPFS access (it's a dedicated Worker; the storage layer runs in the main thread or in `comic-worker`, never inside `libarchive.js`).

A bug in the RAR decoder can crash the worker. It cannot exfiltrate the user's library.

## Code execution from comic content

By design, **no archive content is ever executed**:

- Pages are PNG / JPEG / WebP / GIF / etc., loaded as `<img src="blob:...">`. The browser's image decoder is the only consumer.
- ComicInfo.xml is parsed with `DOMParser` configured for `application/xml`, not `text/html`. No script tags are honoured.
- PDF JavaScript execution is disabled.
- TAR / ZIP / RAR / 7z metadata is treated as data, not code.

If you fork the project and want to render HTML from a comic (e.g. for an EPUB reader), you must add an explicit sandboxed `iframe` boundary with `sandbox="allow-same-origin"` *removed* and a strict CSP applied to the iframe's response.

## Dependency hygiene

- The lockfile (`pnpm-lock.yaml`) is checked in. Production builds use `--frozen-lockfile`.
- `pnpm audit` runs on CI. High-severity advisories block release.
- Major version bumps for `@zip.js/zip.js`, `pdfjs-dist`, `libarchive.js`, and `dexie` get a manual review and a regression test pass before merging.

## Reporting a vulnerability

Please report security issues privately. Do **not** open a public GitHub issue.

- Email: `security@<your-domain>` (replace before publishing the project).
- PGP key: published at `https://<your-domain>/.well-known/security.pgp` (replace before publishing).

We aim to acknowledge reports within 72 hours and publish a fix or mitigation plan within 14 days for high-severity issues. Coordinated disclosure timelines are negotiable; we will not publish your name unless you ask us to.

If you find a vulnerability in one of the upstream libraries (`@zip.js/zip.js`, `pdfjs-dist`, `libarchive.js`, `dexie`), report it to that project as well. We will track the upstream advisory and ship a pinned bump as soon as a patched release is available.
