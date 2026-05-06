# Contributing

Thanks for your interest in improving the Comic Reader Platform. This guide covers the bare minimum you need to start hacking productively.

## Development Setup

### Prerequisites

- Node.js 20.9 or newer (22 LTS recommended)
- pnpm 10 (`corepack enable && corepack prepare pnpm@10 --activate`)
- Git

### First-time install

```bash
git clone https://github.com/<your-fork>/comics.git
cd comics
pnpm install
pnpm dev:web
```

The web app starts on http://localhost:3000. Library data lives in your browser's IndexedDB and OPFS, so resetting state means clearing site data for that origin.

### Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm dev:web` | Run the Next.js app in dev mode |
| `pnpm build` | Build all packages and the app |
| `pnpm typecheck` | Run TypeScript across the workspace |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run Vitest in all packages |

## Branch Convention

- `main` is the trunk; it must always be releasable.
- Use short, scoped feature branches: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`.
- Rebase onto `main` before opening a PR; avoid merge commits inside feature branches.

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(comic-core): add ComicInfo.xml parser
fix(comic-react): correct RTL page navigation
docs: clarify CBR licensing caveats
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`.

Keep the subject under 72 characters. Use the body to explain the why, not the what.

## Adding a New Extractor

Extractors live in their own package: `packages/comic-extractor-<format>/`.

1. Copy the layout of `comic-extractor-zip` as a starting point.
2. Implement the `ComicExtractor` interface from `@comics-platform/comic-core`.
3. Register it via `ExtractorRegistry.register()` in your package's entry point.
4. Add a brief README covering format constraints, dependencies, and licensing notes (especially relevant for CBR/RAR).
5. Add Vitest unit tests covering the happy path and at least one malformed-archive case.

See [`docs/extractor-authoring.md`](./docs/extractor-authoring.md) for a worked example.

## Architecture rules

- The React layer (`@comics-platform/comic-react`) must not know which extractor produced a page. It consumes the `ComicBook`/`ComicPage` contract from `@comics-platform/comic-core`.
- New formats are added as separate extractor packages that implement `ComicExtractor`.
- CBR support stays read-only and behind an optional plugin boundary. RAR compression is proprietary; do not introduce any "create CBR" path.
- User-uploaded comics stay in the browser (IndexedDB + OPFS). Do not add server upload paths to the core viewer.

See [`docs/architecture.md`](./docs/architecture.md) for the full layered overview.

## Testing

- Unit tests use [Vitest](https://vitest.dev). Run them per-package (`pnpm --filter @comics-platform/comic-core test`) or across the workspace (`pnpm test`).
- For browser-API code use the `happy-dom` environment, configured per-package via `vitest.config.ts`.
- Shared fixtures live at `tests/fixtures/` and are imported via the `@fixtures` alias (see `tests/fixtures/README.md`).
- New features should land with tests. Bug fixes should land with a regression test.

## Test Fixtures

Real-world comic archives live under `tests/fixtures/`. Rules:

- **License:** US public domain, CC0, or otherwise MIT-compatible. No exceptions.
- **Size:** under **2 MB per file**, under **10 MB** for the entire `tests/fixtures/` tree.
- **Provenance:** every file is documented in `tests/fixtures/PROVENANCE.md` with title, year, source URL, license basis, byte size, and SHA-256.
- **CBR is downloaded, never created:** RAR compression is proprietary; we don't ship a "build a CBR" path. Use an existing PD `.cbr` from archive.org or similar.
- **Regenerate:** `tools/scripts/regenerate-fixtures.sh` re-pulls upstream sources and rebuilds synthesized files deterministically.

## Pull Requests

- Open an issue before starting non-trivial work so the design can be discussed.
- Keep PRs focused: one feature or fix per PR.
- Update `comic-platform-plan.md` if you change architectural direction.
- Make sure `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass before requesting review.

## License

By contributing you agree your contributions are licensed under the MIT License (see `LICENSE`).
