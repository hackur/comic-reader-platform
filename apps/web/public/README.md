# apps/web/public

Static assets served at the site root.

## Branding

- `logo.svg` — primary mark (uses `currentColor`, themable).
- `apple-touch-icon.svg` — 180x180 sky-blue rounded square, white mark.
- `manifest.webmanifest` — PWA manifest pointing at `logo.svg`.

The Next.js dynamic favicon lives at `apps/web/src/app/icon.svg` (Next 16 convention).

## Generating `apple-touch-icon.png`

iOS home-screen icons must be PNG. We ship the SVG source; convert it once and commit the PNG:

```bash
# Option A: rsvg-convert (Homebrew: brew install librsvg)
rsvg-convert -w 180 -h 180 apps/web/public/apple-touch-icon.svg \
  -o apps/web/public/apple-touch-icon.png

# Option B: sharp via npx
npx -y sharp-cli -i apps/web/public/apple-touch-icon.svg \
  -o apps/web/public/apple-touch-icon.png resize 180 180

# Option C: any svg-to-png tool of your choice
npx -y svg-to-png-cli apps/web/public/apple-touch-icon.svg \
  apps/web/public/apple-touch-icon.png --width 180 --height 180
```

Until the PNG is generated, the SVG fallback referenced from `layout.tsx` is served — modern iOS accepts it for most cases, but Apple's documentation still requires PNG for older devices.
