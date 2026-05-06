#!/usr/bin/env bash
# Regenerate every test fixture from upstream sources + the four PD page images.
# Idempotent: re-running produces the same SHA-256s (modulo upstream changes).
#
# Requires: curl, zip, tar, ImageMagick (`magick`). RAR creation is intentionally
# NOT supported — the CBR fixture is downloaded, never synthesized.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIX="$ROOT/tests/fixtures"

mkdir -p "$FIX"/{cbz,cbr,cbt,pdf,images/sample-folder,malformed}

echo "==> Downloading PD page images (Wikimedia Commons)"
curl -sSL -o "$FIX/images/sample-folder/page-01.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Joaquin_Murrieta_%28comics%29_page_1.jpg/500px-Joaquin_Murrieta_%28comics%29_page_1.jpg"
curl -sSL -o "$FIX/images/sample-folder/page-02.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Joaquin_Murrieta_%28comics%29_page_2.jpg/500px-Joaquin_Murrieta_%28comics%29_page_2.jpg"
curl -sSL -o "$FIX/images/sample-folder/page-03.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Joaquin_Murrieta_%28comics%29_page_4.jpg/500px-Joaquin_Murrieta_%28comics%29_page_4.jpg"
curl -sSL -o "$FIX/images/sample-folder/page-04.jpg" \
  "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Joaquin_Murrieta_%28comics%29_page_11.jpg/250px-Joaquin_Murrieta_%28comics%29_page_11.jpg"

echo "==> Downloading real PD CBZ (Marvel Family #66 inside covers)"
curl -sSL -o "$FIX/cbz/marvel-family-66-inside-covers.cbz" \
  "https://archive.org/download/fawcett_Marvel_Family_066_inside_covers/Marvel%20Family%20066%20inside%20covers.cbz"

echo "==> Downloading real PD CBR (Things To Come 1955-01)"
curl -sSL -o "$FIX/cbr/things-to-come-1955-01.cbr" \
  "https://archive.org/download/thingstocome195501/Things%20To%20Come%20%5B1955-01%5D.cbr"

echo "==> Building synthesized CBZ"
rm -f "$FIX/cbz/synthetic.cbz"
( cd "$FIX/images/sample-folder" && zip -q "$FIX/cbz/synthetic.cbz" page-*.jpg )

echo "==> Building CBZ with ComicInfo.xml"
TMP="$(mktemp -d)"
cp "$FIX"/images/sample-folder/page-*.jpg "$TMP/"
cat > "$TMP/ComicInfo.xml" <<'EOF'
<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Title>Joaquin Murrieta (sample)</Title>
  <Series>Desperado</Series>
  <Number>2</Number>
  <Year>1948</Year>
  <Month>8</Month>
  <Publisher>Lev Gleason</Publisher>
  <Genre>Western</Genre>
  <PageCount>4</PageCount>
  <LanguageISO>en</LanguageISO>
  <Notes>Synthetic fixture. Pages from Wikimedia Commons (PD).</Notes>
</ComicInfo>
EOF
rm -f "$FIX/cbz/with-comicinfo.cbz"
( cd "$TMP" && zip -q "$FIX/cbz/with-comicinfo.cbz" ComicInfo.xml page-*.jpg )
rm -rf "$TMP"

echo "==> Building CBT (no pax headers, no AppleDouble)"
rm -f "$FIX/cbt/synthetic.cbt"
COPYFILE_DISABLE=1 tar --format=ustar --no-xattrs -cf "$FIX/cbt/synthetic.cbt" \
  -C "$FIX/images/sample-folder" page-01.jpg page-02.jpg page-03.jpg page-04.jpg

echo "==> Building synthesized PDF"
rm -f "$FIX/pdf/synthetic.pdf"
magick "$FIX"/images/sample-folder/page-*.jpg "$FIX/pdf/synthetic.pdf"

echo "==> Building malformed fixtures"
TMP="$(mktemp -d)"
echo "not an image, just text" > "$TMP/readme.txt"
rm -f "$FIX/malformed/no-images.cbz"
( cd "$TMP" && zip -q "$FIX/malformed/no-images.cbz" readme.txt )
rm -rf "$TMP"
head -c 1000 "$FIX/cbz/synthetic.cbz" > "$FIX/malformed/truncated.cbz"
printf 'NOTRAR\x00\x01garbagebytesmasqueradingasarararchive' > "$FIX/malformed/wrong-magic.cbr"

echo "==> SHA-256 manifest:"
( cd "$FIX" && find . -type f -not -name '*.md' -not -name '*.ts' | sort | xargs shasum -a 256 )

echo "==> Total size: $(du -sh "$FIX" | cut -f1)"
echo "Done."
