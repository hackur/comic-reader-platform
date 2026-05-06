# Comic Reader Platform — Documentation

User-facing documentation for the Comic Reader Platform monorepo. The codebase is a local-first, browser-based comic archive reader built around a normalized `ComicBook` / `ComicPage` contract and a registry of pluggable format extractors. Nothing in this repo uploads user content to a server.

If you are integrating the React layer into another app, writing a new format extractor, or self-hosting the static shell, start here.

## Contents

| Document | What it covers |
| --- | --- |
| [getting-started.md](./getting-started.md) | Prerequisites, installing the workspace, dev loop, building, deploying to Cloudflare Pages, and troubleshooting common environment issues. |
| [architecture.md](./architecture.md) | Layered package architecture, dependency rules, the normalized book/page abstraction, and the page lifecycle. |
| [extractor-authoring.md](./extractor-authoring.md) | How to write, register, lazy-load, and test a new `ComicExtractor` plugin, with a worked 7z example. |
| [formats.md](./formats.md) | Per-format support table — extensions, magic bytes, libraries, license posture, and known limitations. |
| [storage.md](./storage.md) | How `comic-storage` works: IndexedDB schema, OPFS layout, fallback chain, and how to write a custom storage adapter. |
| [reader-ui.md](./reader-ui.md) | Guide to `ComicReaderShell` and friends — component tree, reading state, view modes, keyboard map, gestures, embedding. |
| [legal.md](./legal.md) | Plain-language legal posture: CBR/RAR situation, MIT license, third-party library notes, and the project's privacy stance. |
| [roadmap.md](./roadmap.md) | Phased delivery plan in user-facing language, with current status and future directions. |
| [contributing.md](./contributing.md) | Workflow, coding standards, commit conventions, testing requirements, and how to add a new package. |
| [faq.md](./faq.md) | Twenty-plus realistic questions: format support, privacy, offline behaviour, browser support, self-hosting, and more. |
| [security.md](./security.md) | Threat model, CSP guidance, PDF.js and RAR worker isolation, and how to report vulnerabilities. |

## Quick links

- Repository root: [`../README.md`](../README.md)
- Long-form design notes: [`../comic-platform-plan.md`](../comic-platform-plan.md)
- Contribution workflow: [`../CONTRIBUTING.md`](../CONTRIBUTING.md)
- License: [`../LICENSE`](../LICENSE)
