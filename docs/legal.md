# Legal

Plain-language summary of the legal posture of this project. Nothing here is legal advice; it describes what the codebase does and the licenses that apply to its parts.

## Project license

The Comic Reader Platform is licensed under the [MIT License](../LICENSE). In short:

- You can use, copy, modify, merge, publish, distribute, sublicense, and sell copies.
- You must include the copyright notice and the MIT permission notice in copies.
- The software is provided "as is", without warranty.

By contributing, you agree that your contributions are licensed under MIT.

## CBR / RAR

CBR is a comic archive in RAR format. **RAR's compression algorithm is proprietary**, owned by RARLAB. There is no open standard you can implement to *create* RAR archives without licensing.

What that means for this project:

- **Reading CBR is supported via an optional plugin** (`@comics-platform/comic-extractor-rar`), which uses `libarchive.js` — a WebAssembly build of `libarchive`, which contains a clean-room reverse-engineered RAR decoder. Decoding RAR is widely accepted in open-source software (7-Zip, libarchive, unar all do it).
- **Creating RAR / writing CBR is out of scope** and will not be added. There is no path to do it without depending on the proprietary RARLAB SDK.
- **CBZ is the first-class open format.** Where the platform has a choice, CBZ wins: it is just a ZIP of images, fully described by an open standard, and creatable by any zip tool.
- The CBR extractor is shipped as a separate package precisely so consumers can omit it. If you fork the project for a context where the RAR baggage is unwelcome, drop the dependency and the registry registration.

## Why CBZ is preferred

| | CBZ | CBR |
| --- | --- | --- |
| Container | ZIP | RAR |
| Compression | Deflate (open) | RAR (proprietary) |
| Creation | Any zip tool | RARLAB tools / licensed encoders |
| Reading | `@zip.js/zip.js` (BSD) | `libarchive.js` (clean-room) |
| Encrypted variants | Not supported in v1 | Not supported in v1 |
| Solid archives | N/A | Slow, not recommended for comics |
| ComicInfo.xml support | Yes | Yes |

Recommend CBZ to your users when you can. CBR is supported because real-world comic libraries contain a lot of it; the goal is to read what users have, not to gatekeep formats.

## Third-party libraries

The platform depends on these runtime libraries. Each carries its own license — review them before redistribution.

| Library | Used in | License | Notes |
| --- | --- | --- | --- |
| `@zip.js/zip.js` | `comic-extractor-zip` | BSD-3-Clause | Pure JS, fully open. |
| `pdfjs-dist` | `comic-extractor-pdf` | Apache-2.0 | Mozilla-maintained. The worker file must be redistributed under the same license. |
| `libarchive.js` | `comic-extractor-rar` | See package LICENSE (libarchive itself is BSD-2-Clause) | Worker + WASM file. The RAR decoder inside is clean-room reverse-engineered. |
| `dexie` | `comic-storage` | Apache-2.0 | IndexedDB wrapper. |
| `comlink` | `comic-worker` | Apache-2.0 | Cross-thread RPC. |
| `react`, `react-dom` | `comic-react`, `apps/web` | MIT | |
| `next` | `apps/web` | MIT | |

Build-time dependencies (Vitest, ESLint, TypeScript, Tailwind, Turbo, Wrangler) carry their own licenses but do not ship in user-facing artifacts.

If you bundle the platform into a closed-source product, audit the runtime libraries listed above and produce attribution accordingly. None of them require source disclosure of your downstream code.

## User content

Reading a comic does not move it anywhere. Specifically:

- Comics are stored locally in IndexedDB and OPFS, both same-origin sandboxes.
- The platform makes no outbound network requests on the user's behalf except when the user explicitly opens a `kind: "url"` source.
- Cloudflare Pages (the default host) serves the static app shell. It does not — and cannot — see what is in the user's browser storage.
- There is no telemetry, no analytics, no error reporting beacon. If you fork and add any of those, document them prominently in your fork's UI.

## Reporting suspected infringement

This project does not host comics. It is a reader for files the user already possesses. We cannot take down content we do not host.

If you are a rights holder and you have found a hosted instance of this software being used to distribute infringing content, contact the operator of that instance, not this repository.

If you have found a license issue with the source code itself (a missing notice, a mis-attributed file, a dependency we should not be using), open an issue on the repository or email the maintainers.
