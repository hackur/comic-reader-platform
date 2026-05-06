# Fixture Provenance

Every binary fixture shipped under `tests/fixtures/` is tracked here. If you add or replace a fixture, append/update the corresponding entry. SHA-256s are recorded so accidental changes (e.g., re-encoding, line-ending damage) fail loudly.

## Licensing rule

Only US-public-domain or CC0/CC-BY-compatible content. Anything copyrighted is rejected at review.

---

## CBZ

### `cbz/marvel-family-66-inside-covers.cbz`

- **Title:** Marvel Family #66 (inside-cover scans)
- **Year / publisher:** 1951, Fawcett Publications
- **Source page:** https://archive.org/details/fawcett_Marvel_Family_066_inside_covers
- **Direct URL:** https://archive.org/download/fawcett_Marvel_Family_066_inside_covers/Marvel%20Family%20066%20inside%20covers.cbz
- **License basis:** US public domain — Fawcett's "Marvel Family" / Captain Marvel line had its copyrights lapse for non-renewal under the 1909 Copyright Act, which is why DC was later able to re-license the characters. Hosted on the Internet Archive's open Fawcett Comics collection.
- **Bytes:** 165,250
- **SHA-256:** `fcc1f224d97e72dfb602f5ff591224d67b612db9a09784ac144eee2d21b01c97`
- **Notes:** Inside-cover scans only (2 JPEG pages), not the full issue. Fine for an extraction smoke test.

### `cbz/synthetic.cbz`

- **What:** Zip of the four `images/sample-folder/page-*.jpg` files (see Images below).
- **License basis:** Inherits from page images (US PD).
- **Bytes:** 626,435
- **SHA-256:** `673d4c71554abcd63460b04c90d04ee40ccd2e988bf642d4546282fe2a54f117`
- **Regenerate:** `(cd tests/fixtures/images/sample-folder && zip -q ../../cbz/synthetic.cbz page-*.jpg)`

### `cbz/with-comicinfo.cbz`

- **What:** Same four pages plus a `ComicInfo.xml` metadata sidecar.
- **License basis:** Inherits from page images (US PD); `ComicInfo.xml` is a hand-written stub.
- **Bytes:** ~626,400
- **SHA-256:** `aaf92fac15d798a40211e1ee4c64babc52060c24be9077c5ac8a0c1200bc7b0b`
- **Regenerate:** `tools/scripts/regenerate-fixtures.sh`

---

## CBR

### `cbr/things-to-come-1955-01.cbr`

- **Title:** Things To Come [1955-01]
- **Year / publisher:** 1955, Doubleday Science Fiction Book Club
- **Source page:** https://archive.org/details/thingstocome195501
- **Direct URL:** https://archive.org/download/thingstocome195501/Things%20To%20Come%20%5B1955-01%5D.cbr
- **License basis:** Marked "Public Domain Mark 1.0" on the source item; a 4-page 1955 SFBC promotional newsletter with no copyright notice, never registered/renewed, PD under the 1909 Copyright Act for failure of notice.
- **Bytes:** 1,084,281
- **SHA-256:** `cbaf70da9bb4cd6f40667fd5bcb277aeb7359f32acb53418f6de7b6a77985e93`
- **Why this one:** the smallest verified-PD `.cbr` we could locate on archive.org. Most US golden-age CBRs run 8 MB+.
- **First-bytes check:** `52 61 72 21 1A 07 00` = valid RAR 1.5 signature (`Rar!\x1A\x07\x00`).

> **We do not synthesize CBRs.** RAR compression is proprietary; the project deliberately ships no CBR-creation path. The CBR fixture must always be a real, downloaded, PD file.

---

## CBT

### `cbt/synthetic.cbt`

- **What:** POSIX tar of the four `images/sample-folder/page-*.jpg` files.
- **License basis:** Inherits from page images (US PD).
- **Bytes:** 629,760
- **SHA-256:** `b4c5c6c5ed679abcf46b368f36a75800b03e820fee3683e6201f3883b58dceef`
- **Regenerate:** `COPYFILE_DISABLE=1 tar --format=ustar --no-xattrs -cf tests/fixtures/cbt/synthetic.cbt -C tests/fixtures/images/sample-folder page-01.jpg page-02.jpg page-03.jpg page-04.jpg` (suppresses macOS pax/AppleDouble entries)

> CBT is rare in the wild; we synthesize from the same image set so the fixture is reproducible.

---

## PDF

We do not ship a real-world PD PDF: the smallest verified one we found (Wonder Woman #1, 1942, ~3.8 MB) exceeded our per-file budget. The synthesized PDF below covers the format. If you need a real-world fixture, fetch one out-of-tree.

### `pdf/synthetic.pdf`

- **What:** ImageMagick-generated PDF wrapping the four `images/sample-folder/page-*.jpg` pages.
- **License basis:** Inherits from page images (US PD).
- **Bytes:** 629,782
- **SHA-256:** `4b23a40b007b8a579f02a8544134f77d76e65fcd0fb7cae50a7e7083e31349cd`
- **Regenerate:** `magick tests/fixtures/images/sample-folder/page-*.jpg tests/fixtures/pdf/synthetic.pdf`

---

## Images (`images/sample-folder/`)

All four pages are scans of *Desperado #2* (Lev Gleason / Comic House, August 1948, art credited to Dan Barry), uploaded to Wikimedia Commons as US public domain (copyright not renewed). They are served from Wikimedia's pre-rendered thumbnail endpoints because Wikimedia only generates thumbs at "blessed" widths.

| File | Source page | Direct URL | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| `page-01.jpg` | https://commons.wikimedia.org/wiki/File:Joaquin_Murrieta_(comics)_page_1.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Joaquin_Murrieta_%28comics%29_page_1.jpg/500px-Joaquin_Murrieta_%28comics%29_page_1.jpg | 177,791 | `1c4cd8302a94b66a3ff8d75e81efafce8b76865940fb53b4e669e41f8ca9569d` |
| `page-02.jpg` | https://commons.wikimedia.org/wiki/File:Joaquin_Murrieta_(comics)_page_2.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Joaquin_Murrieta_%28comics%29_page_2.jpg/500px-Joaquin_Murrieta_%28comics%29_page_2.jpg | 194,037 | `1eeeaa3faae81ada3e9bef935058f5390d9b590d4970854812967f20bc9eadfc` |
| `page-03.jpg` | https://commons.wikimedia.org/wiki/File:Joaquin_Murrieta_(comics)_page_4.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Joaquin_Murrieta_%28comics%29_page_4.jpg/500px-Joaquin_Murrieta_%28comics%29_page_4.jpg | 197,853 | `2a08e50c5cf0234eacdbaf7c6773fb59818f60cefd6be7023053fb3d56ed210b` |
| `page-04.jpg` | https://commons.wikimedia.org/wiki/File:Joaquin_Murrieta_(comics)_page_11.jpg | https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Joaquin_Murrieta_%28comics%29_page_11.jpg/250px-Joaquin_Murrieta_%28comics%29_page_11.jpg |  56,222 | `30605043933938569fe715497e8e1700b26c9913f1327625776dca55545044fe` |

---

## Malformed / negative-case fixtures

| File | Purpose | Bytes | SHA-256 |
| --- | --- | --- | --- |
| `malformed/no-images.cbz` | Valid ZIP but contains only a text file — exercises "no comic pages found" error path. | 194 | `690caf10b8d8800ba8367c8386d4c4398aea46c872b016b081b22e0bd0ff4719` |
| `malformed/truncated.cbz` | First 1000 bytes of `cbz/synthetic.cbz`; missing end-of-central-directory record. | 1,000 | `7e39a88d9a065a254600452ecd9f13a8b124b2c953d4f994c34de41888775b09` |
| `malformed/wrong-magic.cbr` | Random bytes with bogus header — exercises RAR signature rejection. | 45 | `e90808ff0f372da647998416ed95363f0c6e3476d307be42a600b8af9269e2d8` |
