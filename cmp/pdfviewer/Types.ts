/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {FetchOptions} from '@xh/hoist/svc';
import type {ReactNode} from 'react';

/**
 * A PDF document to display. Either:
 *  - a URL, fetched via `XH.fetch()` - relative URLs resolve against `XH.baseUrl`.
 *  - a {@link FetchOptions} object, for POSTs, params, or custom headers.
 *  - the PDF bytes, as a `Blob` (or `File`), `ArrayBuffer`, or `Uint8Array`.
 */
export type PdfSource = string | FetchOptions | Blob | ArrayBuffer | Uint8Array;

/**
 * Zoom level for a {@link PdfViewerModel}. Either a numeric scale (1 = 100%) or a preset that
 * re-fits the document as the viewer resizes:
 *  - `page-width` - fit page width to the viewer.
 *  - `page-fit` - fit the entire page within the viewer.
 *  - `page-actual` - display at actual size (100%).
 *  - `auto` - page width, capped at actual size.
 */
export type PdfScale = 'page-width' | 'page-fit' | 'page-actual' | 'auto' | number;

/**
 * Built-in toolbar items:
 *  - `pageNav` - previous/next buttons and a page number input.
 *  - `zoom` - zoom in/out buttons and a zoom level menu.
 *  - `find` - search input with match count and previous/next buttons.
 *  - `rotate` - rotate pages clockwise.
 *  - `download` - download the document.
 *  - `-` - a separator.
 *  - `filler` - a flexible spacer, to right-align subsequent items.
 */
export type PdfViewerToolbarToken =
    'pageNav' | 'zoom' | 'find' | 'rotate' | 'download' | '-' | 'filler';

/** A built-in toolbar token or any custom element, such as a button. */
export type PdfViewerToolbarItem = PdfViewerToolbarToken | ReactNode;

/**
 * Toolbar config for a {@link PdfViewerModel} - `true` for the platform default items (see
 * {@link PdfViewerModel.defaults}), `false` to hide the toolbar, or a list of items.
 */
export type PdfViewerToolbarSpec = boolean | PdfViewerToolbarItem[];
