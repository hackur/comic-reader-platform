# @comics-platform/comic-react

React 19 components, providers, and hooks for building a comic reader UI
on top of `@comics-platform/comic-core`. Ships a fully composed
`ComicReaderShell` (toolbar + viewer + thumbnail rail + page slider) plus
the lower-level building blocks if you want to assemble your own layout.

## Install

```bash
pnpm add @comics-platform/comic-react @comics-platform/comic-core react react-dom lucide-react
```

## Usage

Drop the prebuilt shell into a page after opening a `ComicBook` with
any extractor:

```tsx
import { ComicReaderShell } from "@comics-platform/comic-react";
import type { ComicBook } from "@comics-platform/comic-core";

export function Reader({ book, onClose }: { book: ComicBook; onClose: () => void }) {
  return (
    <div className="h-screen w-screen">
      <ComicReaderShell
        book={book}
        showRail
        onClose={onClose}
        initialState={{ fitMode: "width", readingDirection: "ltr" }}
      />
    </div>
  );
}
```

Or compose the pieces yourself when you need a custom layout:

```tsx
import {
  ReadingStateProvider,
  ComicViewer,
  ViewerToolbar,
  PageSlider,
  useReadingState,
  useKeyboardNav,
} from "@comics-platform/comic-react";

function Custom({ book }) {
  return (
    <ReadingStateProvider pageCount={book.pageCount}>
      <ViewerToolbar title={book.title} />
      <ComicViewer book={book} />
      <PageSlider />
    </ReadingStateProvider>
  );
}
```

For a full app, wrap the tree with `ExtractorProvider` and
`LibraryProvider` so dropzones and import buttons can resolve a
registry and persist comics.

## API

### Components

| Export | Description |
| --- | --- |
| `ComicReaderShell` | Composed reader: toolbar, viewer, optional rail, page slider. |
| `ComicViewer` | The main page-rendering surface (single / spread / strip). |
| `ViewerToolbar` | Top toolbar with fit, zoom, rotate, view-mode controls. |
| `PageSlider` | Bottom scrubber bound to `ReadingState.currentPage`. |
| `ThumbnailRail` | Scrollable side rail of page thumbnails. |
| `PageImage` | Low-level lazy `<img>` for a single `ComicPage`. |
| `ComicDropzone` | Drag-and-drop import surface. |
| `ComicGridLibrary` | Library grid view of stored comics. |
| `ComicCard` | Individual library cover card. |
| `ImportButton` | File-picker import button. |

### Providers & hooks

| Export | Description |
| --- | --- |
| `ReadingStateProvider`, `useReadingState` | Per-book reading state (page, zoom, fit, direction, view mode). |
| `ExtractorProvider`, `useExtractorRegistry` | Inject a `ComicCore` `ExtractorRegistry` into the tree. |
| `LibraryProvider`, `useComicLibrary` | Bind a `ComicStorage` to library views and import flows. |
| `useKeyboardNav` | Arrow / page-up-down / home-end keyboard navigation. |
| `useTouchSwipe` | Touch swipe gesture handler for next/prev page. |
| `usePagePreloader` | Eagerly fetch nearby page blobs to smooth navigation. |

All component prop types are exported alongside the components
(e.g. `ComicReaderShellProps`, `ComicViewerProps`).

## Peer dependencies

From `package.json`:

- `react` `^19.0.0`
- `react-dom` `^19.0.0`
- `lucide-react` `>=1` (used by toolbar / library icons)

Required runtime dependency:

- `@comics-platform/comic-core` (workspace dep — install alongside).

The package is unstyled-agnostic but the bundled shell uses Tailwind-style
utility classes; bring your own Tailwind setup or restyle as needed.

## Related

- [`@comics-platform/comic-core`](../comic-core) — types and registry.
- [`@comics-platform/comic-storage`](../comic-storage) — storage adapter for `LibraryProvider`.
- [`@comics-platform/comic-worker`](../comic-worker) — off-main-thread extraction client.
- [`@comics-platform/comic-extractor-zip`](../comic-extractor-zip) and sibling extractors — register with `ExtractorProvider`.
