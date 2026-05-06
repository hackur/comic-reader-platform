# Reader UI

`@comics-platform/comic-react` is the React layer. It ships a viewer (`ComicReaderShell`), a library grid (`ComicGridLibrary`), a search/filter bar (`LibrarySearchBar`), an import button and dropzone, side panels (`MetadataPanel`, `BookmarksPanel`, `ShortcutsModal`), context providers (`ReadingStateProvider`, `LibraryProvider`, `ExtractorProvider`, `ThemeProvider`), and hooks (`useKeyboardNav`, `useTouchSwipe`, `usePagePreloader`, `useReadingState`, `useComicLibrary`, `useExtractorRegistry`, `useBookmarks`, `useTheme`, `useLibraryError`).

This doc is for developers embedding the viewer in another app or customizing the default UI.

## Component tree

```text
ThemeProvider
└── ExtractorProvider
    └── LibraryProvider
        └── (your routing layer)
            ├── LibrarySearchBar              (title query + format chips + sort)
            ├── ComicGridLibrary
            │     └── ComicCard (×N)          (cover thumbnail via loadThumbnail prop)
            │     └── ImportButton
            └── ComicReaderShell
                  ├── ReadingStateProvider    [internal]
                  ├── ViewerToolbar           (title, close, fit, zoom, rotate, RTL, mode, info, bookmarks?)
                  ├── ThumbnailRail           (optional; toggled by `showRail`)
                  ├── ComicViewer
                  │     └── PageImage (×currentPage[s])
                  ├── PageSlider              (drag to scrub)
                  ├── MetadataPanel           (toggled by Info button — ComicInfo.xml fields)
                  ├── BookmarksPanel          (toggled by Bookmarks button when enableBookmarks)
                  └── ShortcutsModal          (toggled by '?' key)
```

`ComicReaderShell` is the main embed surface. Pass it a `ComicBook` (from any extractor) and it handles the rest.

```tsx
import { ComicReaderShell } from "@comics-platform/comic-react";

<ComicReaderShell
  book={book}
  initialState={{ readingDirection: "rtl", viewMode: "spread" }}
  showRail
  onClose={() => router.push("/library")}
/>;
```

`ComicReaderShellProps`:

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `book` | `ComicBook` | required | The normalized book. Any extractor's output works. |
| `initialState` | `Partial<ReadingState>` | `undefined` | Seed the reducer (page, zoom, fit, direction, view mode). |
| `showRail` | `boolean` | `true` | Show the thumbnail rail on the left. |
| `onClose` | `() => void` | `undefined` | Called when the toolbar's close button is pressed. |
| `className` | `string` | `''` | Appended to the outer container. |
| `enableBookmarks` | `boolean` | `false` | Show the bookmarks button + panel and bind `b` to add. Requires a `LibraryProvider` in scope (uses `addBookmark`/`listBookmarks`). |
| `onPageChange` | `(page: number) => void` | `undefined` | Fires every time `currentPage` changes. Use this to persist last-read state. Debounce in the host. |

## Reading state shape

```ts
interface ReadingState {
  currentPage: number;            // 0-based
  zoom: number;                   // clamped to [0.25, 6]
  rotation: number;               // 0 / 90 / 180 / 270
  fitMode: "width" | "height" | "best" | "original";
  readingDirection: "ltr" | "rtl";
  viewMode: "single" | "spread" | "strip";
}
```

Plus the action surface from `useReadingState()`:

```ts
interface ReadingStateActions {
  nextPage(): void;
  prevPage(): void;
  goToPage(page: number): void;
  setFit(fit: ReadingState["fitMode"]): void;
  setZoom(zoom: number): void;
  rotate(delta?: number): void;             // default +90
  toggleDirection(): void;
  setViewMode(mode: ReadingState["viewMode"]): void;
}
```

Notes on the reducer:

- `setFit` resets `zoom` to 1, because fit mode and explicit zoom are mutually exclusive UI concepts.
- `nextPage` / `prevPage` step by 2 in `spread` view mode and by 1 otherwise.
- `setZoom` is clamped to `[0.25, 6]`.
- `rotate(delta)` is modulo 360.
- `goToPage` is clamped to `[0, pageCount - 1]`.

## View modes

| Mode | Layout | Step |
| --- | --- | --- |
| `single` | One page at a time, fits to viewport. | 1 page. |
| `spread` | Two pages side-by-side. The toolbar's spread toggle picks parity. | 2 pages. |
| `strip` | Vertical scroll, pages stacked top-to-bottom. | Implicit via scroll. |

Reading direction `rtl` flips the spread order and inverts arrow-key navigation (right arrow goes to previous page).

## Keyboard map

`useKeyboardNav()` is wired by default inside `ComicViewer`. Keys are no-ops while focus is in an `INPUT`, `TEXTAREA`, or `contentEditable` element.

| Key | Action |
| --- | --- |
| `→` (right arrow) | Next page (LTR) / previous page (RTL). |
| `←` (left arrow) | Previous page (LTR) / next page (RTL). |
| `Space` | Next page. Prevents default scroll. |
| `PageDown` | Next page. Prevents default scroll. |
| `PageUp` | Previous page. Prevents default scroll. |
| `Home` | First page. |
| `End` | Last page. |
| `+` / `=` | Zoom in by 0.1. |
| `-` / `_` | Zoom out by 0.1. |
| `0` | Reset zoom to 1.0. |
| `r` / `R` | Rotate 90° clockwise. |
| `f` / `F` | Set fit mode to `best`. |
| `b` / `B` | Add bookmark for the current page (only when `enableBookmarks`). |
| `?` | Toggle the keyboard shortcuts modal. |

`useKeyboardNav({ enabled: false })` disables the listener; `target` overrides which element receives `keydown`.

## Touch / pointer gestures

`useTouchSwipe()` exposes a ref + handler bag you can spread onto any element. It uses Pointer Events, so it works for touch, pen, and mouse drag.

Defaults:

| Option | Default | Meaning |
| --- | --- | --- |
| `threshold` | `60` (px) | Minimum distance before a swipe is recognized. |
| `velocity` | `0.3` (px/ms) | Minimum velocity. |

Wire-up:

```tsx
const { ref, handlers } = useTouchSwipe({
  onSwipeLeft: nextPage,
  onSwipeRight: prevPage,
});

<div ref={ref} {...handlers} />;
```

The default viewer wires left/right swipes to next/prev with the same RTL inversion as the keyboard.

## Customization hooks

| Hook | Use case |
| --- | --- |
| `useReadingState()` | Read or mutate the current reading state. Throws if used outside `ReadingStateProvider`. |
| `useComicLibrary()` | Read the library list, change sort, import / remove / record last-read. Throws outside `LibraryProvider`. |
| `useExtractorRegistry()` | Look up extractors at runtime; useful for "Open with..." menus. |
| `usePagePreloader({ pageCount, currentPage, lookahead })` | Prewarm `getObjectUrl()` for upcoming pages so flips are instant. Lookahead defaults to 2. |
| `useKeyboardNav()` | Attach the default keyboard map to a custom container. |
| `useTouchSwipe()` | Attach swipe handlers anywhere. |

## Embedding in a different app

The package is framework-agnostic past React 19. Minimal embed:

```tsx
import { LibraryProvider, ExtractorProvider, ComicReaderShell } from "@comics-platform/comic-react";
import { createComicStorage } from "@comics-platform/comic-storage";
import { defaultRegistry, detectFormat } from "@comics-platform/comic-core";
import { ZipComicExtractor } from "@comics-platform/comic-extractor-zip";

defaultRegistry.register("cbz", new ZipComicExtractor());
const storage = await createComicStorage();

const importer = async (source) => {
  const format = await detectFormat(source);
  const extractor = await defaultRegistry.resolve(source);
  const book = await extractor.open(source);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await storage.addComic({
    id,
    title: book.title,
    format,
    sourceName: source.kind === "file" ? source.file.name : id,
    addedAt: now,
    updatedAt: now,
    pageCount: book.pageCount,
    metadata: book.metadata,
  });
  if (source.kind === "file") await storage.setArchiveBlob(id, source.file);
  return (await storage.getComic(id))!;
};

export function MyApp({ book }) {
  return (
    <ExtractorProvider registry={defaultRegistry}>
      <LibraryProvider storage={storage} importer={importer}>
        <ComicReaderShell book={book} enableBookmarks />
      </LibraryProvider>
    </ExtractorProvider>
  );
}
```

`LibraryProvider` requires both `storage` (anything implementing the `ComicStorage` shape) and `importer` (a closure that turns a `ComicSource` into a persisted `LibraryRecord`). Splitting the importer keeps the React package format-agnostic — the host wires registry + storage together.

Three things to watch for in non-Next apps:

- **Tailwind 4.** The package's class names assume Tailwind 4 is configured at the host. If you don't use Tailwind, override `className` and supply your own styles.
- **Client components.** Every interactive file declares `'use client'`. With other frameworks (Remix, Vite + React, etc.), this directive is ignored harmlessly.
- **PDF.js worker.** If you register the PDF extractor, call `configurePdfWorker(url)` once before the first PDF open. See [getting-started.md](./getting-started.md).
- **libarchive.js worker.** If you register the RAR extractor, call `configureRarWorker(url)` once before the first CBR open. The default points at `/vendor/libarchive/worker-bundle.js`, which the bundled `apps/web` populates via `tools/scripts/copy-vendor-assets.mjs`.

## Accessibility

The viewer ships with these a11y commitments today:

- All toolbar actions have `aria-label`s.
- Keyboard nav covers every action that has a button.
- Focus is not trapped inside the viewer — `Esc` closes via `onClose` if you wire it up.

Open gaps (tracked in the roadmap): per-page alt text via OCR, contrast-aware reading-rule overlays, and a screen-reader-friendly "skip to next chapter" hook for `ComicInfo.xml`-aware archives.
