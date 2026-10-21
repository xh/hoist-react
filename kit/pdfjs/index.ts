/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {checkVersion} from '@xh/hoist/utils/js';

export type PdfJsLib = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
export type PdfJsViewerLib = typeof import('pdfjs-dist/legacy/web/pdf_viewer.mjs');

/** The pdf.js core and viewer component libraries, loaded on demand. */
export interface PdfJs {
    lib: PdfJsLib;
    viewer: PdfJsViewerLib;
    /** Shared worker for parsing documents - pass to `getDocument()`. */
    worker: InstanceType<PdfJsLib['PDFWorker']>;
    /** Supplies wasm decoders and fonts to pdf.js - pass to `getDocument()`. */
    BinaryDataFactory: any;
}

const MIN_VERSION = '6.3.0';
const MAX_VERSION = '6.*.*';

let loadPromise: Promise<PdfJs> = null;

/**
 * Load pdf.js on first use. Apps opt in by adding `pdfjs-dist` to their own dependencies -
 * Hoist declares it as an optional peer dependency.
 *
 * The library, its worker, and its CSS are split into separate chunks by the app bundler and
 * fetched only when a PDF is first displayed. No app-side bootstrap or build config is required.
 *
 * Uses the pdf.js "legacy" build, which supports a wider range of browsers than its modern build.
 */
export function loadPdfJsAsync(): Promise<PdfJs> {
    loadPromise ??= loadInternalAsync().catch(e => {
        loadPromise = null;
        throw e;
    });
    return loadPromise;
}

//------------------
// Implementation
//------------------
async function loadInternalAsync(): Promise<PdfJs> {
    // The viewer module reads `globalThis.pdfjsLib`, set by the core module - load in sequence.
    const lib = await import('pdfjs-dist/legacy/build/pdf.mjs'),
        {version} = lib;
    if (!checkVersion(version, MIN_VERSION, MAX_VERSION)) {
        throw new Error(
            `This version of Hoist requires a pdfjs-dist version between ${MIN_VERSION} and ` +
                `${MAX_VERSION}. Version ${version} detected.`
        );
    }

    const [viewer] = await Promise.all([
        import('pdfjs-dist/legacy/web/pdf_viewer.mjs'),
        import('./styles')
    ]);

    // Let the app bundler emit the worker as its own chunk. Serving the raw `.mjs` file would
    // rely on servers sending `.mjs` with a JS MIME type. One worker serves all documents for
    // the life of the app - pdf.js leaves a caller-supplied worker running when a document closes.
    const port = new Worker(
            new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url),
            {type: 'module'}
        ),
        worker = lib.PDFWorker.create({port});

    return {lib, viewer, worker, BinaryDataFactory: HoistBinaryDataFactory};
}

/**
 * Binary assets pdf.js may request while parsing a document, resolved by the app bundler.
 * Wasm decoders cover JPEG2000 and JBIG2 images, common in scanned documents. The two fonts are
 * the only standard fonts pdf.js fetches when `useSystemFonts` is enabled (the browser default).
 */
const BINARY_ASSETS: Record<string, URL> = {
    'openjpeg.wasm': new URL('pdfjs-dist/wasm/openjpeg.wasm', import.meta.url),
    'jbig2.wasm': new URL('pdfjs-dist/wasm/jbig2.wasm', import.meta.url),
    'FoxitSymbol.pfb': new URL('pdfjs-dist/standard_fonts/FoxitSymbol.pfb', import.meta.url),
    'FoxitDingbats.pfb': new URL('pdfjs-dist/standard_fonts/FoxitDingbats.pfb', import.meta.url)
};

/**
 * Implements the pdf.js `BinaryDataFactory` contract over {@link BINARY_ASSETS}. Passing a
 * custom factory also tells pdf.js to route these requests through the main thread, so they
 * are served from the app's own origin like any other bundled asset.
 */
class HoistBinaryDataFactory {
    async fetch({kind, filename}: {kind: string; filename: string}): Promise<Uint8Array> {
        const url = BINARY_ASSETS[filename];
        if (!url) throw new Error(`PDF ${kind} asset '${filename}' is not available.`);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Unable to load PDF asset at ${url}.`);
        return new Uint8Array(await response.arrayBuffer());
    }
}
