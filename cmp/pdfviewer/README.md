# PDF Viewer Package

## Overview

The `/cmp/pdfviewer/` package provides `PdfViewer` and its backing `PdfViewerModel`, which
display PDF documents inside a Hoist app. The viewer is built on Mozilla's
[pdf.js](https://mozilla.github.io/pdf.js/), the engine inside Firefox.

**Key features:**
- Load documents from a URL, a `FetchOptions` object, or bytes the app already holds
- Pages render on demand as they scroll into view
- Selectable text and working links
- Find with match highlighting, zoom presets that refit on resize, and rotation
- A built-in toolbar configured with tokens, and open to custom elements
- Observable state and actions on the model for app-built controls
- Light and dark themes, with styling through CSS variables

The component and model are cross-platform. The toolbar has a desktop and a mobile version.

## Installation

Hoist declares `pdfjs-dist` as an optional peer dependency. Add it to your app to opt in:

```bash
pnpm add pdfjs-dist
```

No bootstrap call or build config is needed. Hoist loads pdf.js the first time a viewer shows a
document. The app bundler splits the library, its worker, and its CSS into separate chunks, so
apps pay no bundle cost until then. Apps that never import this package do not need `pdfjs-dist`.

Hoist uses the pdf.js "legacy" build, which supports a wider range of browsers than its modern
build.

## Basic Usage

Create the model in your own model, and render the component where the document should appear:

```typescript
import {pdfViewer, PdfViewerModel} from '@xh/hoist/cmp/pdfviewer';

class DocDetailModel extends HoistModel {
    @managed pdfViewerModel = new PdfViewerModel({
        filename: 'statement.pdf',
        persistWith: {localStorageKey: 'docDetail'}
    });

    showDoc(docId: string) {
        this.pdfViewerModel.setSource(`api/docs/${docId}/content`);
    }
}

const docDetail = hoistCmp.factory<DocDetailModel>(({model}) =>
    panel({title: 'Document', item: pdfViewer({model: model.pdfViewerModel})})
);
```

The component fills its container by default (`flex: 1`). It shows a loading mask while a
document loads, an error with a Retry button if the load fails, and a placeholder when there
is no source.

## Sources

Set the document with the `source` config or `setSource()`. Pass null to clear it.

| Source | Loaded via | Typical use |
|--------|------------|-------------|
| URL string | `XH.fetch()` | Server endpoint. Relative URLs resolve against `XH.baseUrl`. |
| `FetchOptions` | `XH.fetch()` | A POST that generates a PDF, or custom params and headers |
| `Blob` or `File` | Read in place | A blob from an authenticated API call, or a local file before upload |
| `ArrayBuffer` or `Uint8Array` | Copied | Bytes the app already holds |

URL sources go through `XH.fetch()`, so they get the same auth, headers, and error handling as
any other Hoist request. pdf.js moves the bytes it parses to its worker. The model copies app
buffers first, so your `ArrayBuffer` or `Uint8Array` stays usable.

When the source changes, the model closes the old document and loads the new one. A newer
source always wins over a load still in progress.

## Toolbar

Configure the built-in toolbar with the `toolbar` config:

- `true` (default) - the platform defaults from `PdfViewerModel.defaults`
- `false` - no toolbar
- An array of tokens and custom elements, rendered in order

| Token | Renders |
|-------|---------|
| `pageNav` | Previous and next buttons, page number input |
| `zoom` | Zoom out and in buttons, zoom level menu |
| `find` | Search input, match count, previous and next buttons |
| `rotate` | Rotate clockwise button |
| `download` | Download button |
| `-` | Separator |
| `filler` | Flexible space, to push later items right |

Any other item renders as given. Use this to add your own buttons:

```typescript
new PdfViewerModel({
    toolbar: [
        'pageNav',
        'filler',
        'find',
        '-',
        button({text: 'Approve', onClick: () => this.approveAsync()}),
        'download'
    ]
});
```

To change the toolbar for the whole app, set `PdfViewerModel.defaults.toolbar` or
`PdfViewerModel.defaults.mobileToolbar` at startup.

The mobile toolbar renders the same tokens in a compact form. Its find input has no keyboard
shortcuts.

## Model API

The built-in toolbar uses only the public model API. Custom controls can bind to the same
state, or you can drive the viewer from code.

| Member | Kind | Description |
|--------|------|-------------|
| `pageNumber`, `pageCount` | observable | Current page, from 1, and total pages |
| `goToPage()`, `nextPage()`, `previousPage()` | action | Navigate. `goToPage()` clamps out-of-range values. |
| `scale`, `currentScale` | observable | Requested zoom (preset or number), and the resolved number |
| `setScale()`, `zoomIn()`, `zoomOut()` | action | Change zoom |
| `rotation`, `rotate()` | observable, action | Page rotation in degrees, in 90-degree steps |
| `findQuery` | bindable | Find text. Matches highlight as it changes. |
| `findMatchCount`, `findMatchNumber` | observable | Match total, and the selected match from 1 |
| `findNext()`, `findPrevious()` | action | Select and scroll to a match |
| `downloadAsync()` | action | Save the loaded document as `downloadFilename` |
| `hasSource`, `hasDocument` | getter | A source is set, and a document has loaded |
| `pdfDocument` | observable | The pdf.js `PDFDocumentProxy`, for direct API access |
| `loadObserver`, `lastLoadException` | load support | Standard Hoist load state |

Zoom presets are `page-width` (the default), `page-fit`, `page-actual`, and `auto`. A preset
refits the document whenever the viewer resizes. A number is a fixed scale, where 1 is 100%.

Pass `persistWith` to save the user's zoom level. The model persists `scale` only.

## Styling

The viewer follows the Hoist theme. Override these CSS variables to adjust it:

| Variable | Default |
|----------|---------|
| `--xh-pdf-viewer-bg` | `--xh-bg-alt` |
| `--xh-pdf-viewer-page-shadow` | A soft drop shadow, darker in the dark theme |
| `--xh-pdf-viewer-page-gap-px` | `10px` |
| `--xh-pdf-viewer-highlight-bg` | Translucent amber |
| `--xh-pdf-viewer-highlight-selected-bg` | Translucent orange |

Pages keep their own colors in the dark theme, as in other PDF readers.

## How It Works

- `kit/pdfjs` loads pdf.js with dynamic imports and checks its version. It starts one worker
  for the whole app, and serves the wasm image decoders and fonts that pdf.js requests. The
  decoders handle JPEG2000 and JBIG2 images, which are common in scanned documents.
- `PdfViewerModel` owns the document and the pdf.js `PDFViewer`. It turns pdf.js events into
  MobX state.
- `PdfViewer` renders the scroll container that pdf.js draws into, plus the mask, error, and
  placeholder states.
- The pdf.js stylesheet also styles Mozilla's full viewer app, with generic selectors such as
  `button` and `.dialog`. Hoist ships a copy scoped to `.xh-pdf-viewer`, so its rules never apply
  outside a viewer. `scripts/generate-pdfjs-css.mjs` builds it, and `pnpm check:vendored` keeps it
  in step with the installed pdf.js.
- The platform toolbars install through `@xh/hoist/dynamics`. They import the model as a type
  only, so pdf.js stays out of apps that do not use the viewer.

## Limitations

- No print, thumbnails, outline sidebar, or annotation editing yet.
- Password-protected documents show a load error.
- CJK text in documents that do not embed their character maps can render incorrectly. Hoist
  does not bundle the pdf.js CMap files.
- Documents load in full before display. pdf.js range requests and streaming are not used.

## Related Packages

- [`/cmp/layout/`](../layout/README.md) - `placeholder` and layout containers used by the viewer
- [`/svc/`](../../svc/README.md) - `FetchService`, which loads URL and `FetchOptions` sources
- [`/kit/`](../../kit/README.md) - third-party library wrappers, including `kit/pdfjs`
