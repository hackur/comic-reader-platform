# Test Fixtures

Real, public-domain comic archives plus a small set of synthesized files. Used by every extractor's vitest suite via the `@fixtures` alias.

```text
tests/fixtures/
├── PROVENANCE.md          # license + source URL + SHA-256 for every file here
├── loader.ts              # `loadFixture()` / `fixturePath()` / `loadFixtureFile()`
├── cbz/
│   ├── marvel-family-66-inside-covers.cbz   # real PD comic (Fawcett, 1951)
│   ├── synthetic.cbz                        # zip of images/sample-folder
│   └── with-comicinfo.cbz                   # synthetic + ComicInfo.xml
├── cbr/
│   └── things-to-come-1955-01.cbr           # real PD CBR (smallest verified)
├── cbt/
│   └── synthetic.cbt                        # tar of images/sample-folder
├── pdf/
│   └── synthetic.pdf                        # ImageMagick'd PDF of the image set
├── images/sample-folder/
│   └── page-{01..04}.jpg                    # PD pages from Wikimedia Commons
└── malformed/                                # negative-case fixtures
    ├── no-images.cbz
    ├── truncated.cbz
    └── wrong-magic.cbr
```

## Using a fixture in a test

```ts
import { loadFixture, loadFixtureFile, fixturePath } from '@fixtures'

const bytes = await loadFixture('cbz/synthetic.cbz')          // Uint8Array
const file  = await loadFixtureFile('cbz/synthetic.cbz')      // File
const path  = fixturePath('cbz/synthetic.cbz')                // absolute path
```

The `@fixtures` alias resolves to `tests/fixtures/loader.ts` and is wired into each package's `vitest.config.ts`.

## Adding a fixture

1. Verify the file is **public domain** in the US, **CC0**, or another MIT-compatible license.
2. Keep each fixture **under 2 MB**. Total `tests/fixtures/` budget: **10 MB**.
3. Drop the file in the appropriate subdir.
4. Append an entry to `PROVENANCE.md` with: title, year, publisher, source page URL, direct URL, license basis, byte size, SHA-256.
5. If it's synthesized (e.g., generated via `tar` or `magick`), document the exact command in PROVENANCE.

## Regenerating

```bash
tools/scripts/regenerate-fixtures.sh
```

Re-downloads upstream files, re-builds synthesized ones, re-computes SHA-256s. If a hash changes, treat as a real signal — investigate before updating PROVENANCE.

## Why we ship binaries instead of generating at test time

- CBR cannot be created without proprietary tooling. The CBR fixture *must* be a real downloaded file.
- Real PDF/CBZ files exercise corner cases (trailing junk bytes, mac-resource-fork entries, oddball compression methods) that ImageMagick/zip output never produces.
- Determinism: tests should not require network access to run.
