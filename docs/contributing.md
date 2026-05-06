# Contributing

The repository's [`CONTRIBUTING.md`](../CONTRIBUTING.md) is the canonical short version. This page expands the development workflow, coding standards, testing requirements, and the recipe for adding a new package.

## Workflow

```text
fork  ->  branch  ->  commit  ->  push  ->  pull request  ->  review  ->  squash-merge to main
```

1. **Fork** the repository on GitHub.
2. **Branch** from `main`. Names are `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`. Keep them short.
3. **Open an issue first** for non-trivial work. We would rather discuss the design before you write the code.
4. **Rebase, don't merge.** Keep your branch linear with `git rebase main` until your PR is opened.
5. **Pull request.** One feature or fix per PR. Link the issue.
6. **Squash-merge** is the default. The PR title becomes the commit message.

## Coding standards

The project is opinionated about a small number of things and lenient about the rest.

### TypeScript

- `strict: true` is non-negotiable. `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, etc. are all on.
- `any` is forbidden in source code except where a third-party library forces it. When you need it, scope it as tightly as possible (`// eslint-disable-next-line @typescript-eslint/no-explicit-any`) and add a comment explaining why.
- Prefer `interface` over `type` for public API shapes (book, page, extractor, storage). `interface` produces nicer error messages and supports declaration merging if a downstream consumer needs it.
- Prefer `type` for unions, mapped types, and one-shot internal aliases.
- Use the `import type` syntax for type-only imports. The build relies on it for tree-shaking.

### Module style

- ES modules only. `.js` extension on relative imports (TypeScript's NodeNext resolution requires it).
- One default export per file is fine; one named export per concept is preferred for greppability.
- Files declare `'use client'` only when they actually need it (hooks, components that touch DOM).

### Naming

- Packages: `@comics-platform/<short-noun>`. Extractor packages are `comic-extractor-<format>`.
- Files: `kebab-case.ts` for libraries, `PascalCase.tsx` for React components.
- Public types use `Comic*` prefix (`ComicBook`, `ComicPage`, `ComicExtractor`).
- Errors use `*Error` suffix and extend `ComicError` where the failure is part of the comic-opening lifecycle.

### Linting

ESLint flat config in `eslint.config.mjs` is the source of truth. Run `pnpm lint` before pushing. The config favours correctness checks over style — we leave formatting to Prettier (default settings, no project config).

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(comic-extractor-zip): support ComicInfo.xml in any directory
fix(comic-react): prevent RTL inversion in vertical strip mode
docs(architecture): clarify worker boundary
chore(deps): bump @zip.js/zip.js to 2.8.27
```

Common types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`.

Subject ≤ 72 characters, imperative mood, no trailing period. Body is wrapped at 80 columns. Use the body to explain *why*, not what — the diff already says what.

## Testing requirements

| Change kind | Required tests |
| --- | --- |
| New feature | At least one happy-path test plus one edge-case. |
| Bug fix | A regression test that fails on `main` and passes on your branch. |
| New extractor | Fixture archive + happy path + truncated archive + no-images + cancellation. |
| Refactor | Existing tests must still pass; add tests for any newly exposed surface. |
| Docs | None, but `pnpm typecheck` must still pass. |

Runner: [Vitest](https://vitest.dev). Browser-API code uses the `happy-dom` environment, configured per-package via `vitest.config.ts`.

```bash
pnpm test                                       # everything
pnpm --filter @comics-platform/comic-core test  # one package
pnpm --filter @comics-platform/comic-react test --watch
```

## How to add a new package

1. Decide the role. If it implements a format, it goes in `packages/comic-extractor-<format>`. Otherwise, pick a short noun that describes the layer.
2. Copy the layout of the closest existing package. `comic-extractor-zip` is the canonical extractor template; `comic-storage` is the canonical service template.
3. Create:

   ```text
   packages/comic-<thing>/
   ├── package.json          # name = @comics-platform/comic-<thing>
   ├── tsconfig.json         # extends ../../tsconfig.base.json
   ├── vitest.config.ts      # if you have tests
   ├── src/
   │   └── index.ts
   └── test/
       └── (your tests)
   ```

4. In `package.json`:
   - `"name": "@comics-platform/comic-<thing>"`
   - `"version": "0.0.0"`
   - `"type": "module"`
   - `"main"` and `"types"` point at the build output (`dist/index.js`, `dist/index.d.ts`).
   - `"exports"` mirrors `main` so subpath imports work: `"./*": "./dist/*.js"`.
   - Workspace dependencies use `"workspace:*"` ranges.
5. Add the package to the root `pnpm-workspace.yaml` (it should already cover `packages/*`).
6. Add a Turborepo task entry if your package has a non-default build pipeline.
7. Run `pnpm install` from the repo root to wire up the workspace symlinks.
8. Write the implementation, then add tests, then update [`docs/architecture.md`](./architecture.md) and (if it's an extractor) [`docs/formats.md`](./formats.md).
9. If the package is consumed by `apps/web`, add an explicit dependency in `apps/web/package.json`. Do not rely on transitive resolution.

## Architecture rules (recap)

These rules are enforced by review:

- The React layer must not know which extractor produced a page. It consumes the `ComicBook`/`ComicPage` contract from `comic-core`.
- New formats are added as separate extractor packages.
- CBR support stays read-only and behind an optional plugin boundary.
- User-uploaded comics stay in the browser. Do not add server upload paths to the core viewer.
- `comic-core` has zero runtime dependencies. Don't add any.

See [architecture.md](./architecture.md) for the full layered overview.

## Release flow

Releases are cut from `main`. The project uses semver per package; coordinated bumps happen in a single `release: ...` commit. Pre-1.0 packages may break compatibility on minor versions, but document the break in `CHANGELOG.md` and call it out in the release notes.

## Code of conduct

Be polite. Disagree about technical decisions, not about people. The maintainers reserve the right to lock issues, close PRs, and ban contributors who make the project worse to be around.

## License

By contributing you agree your contributions are licensed under the [MIT License](../LICENSE).
