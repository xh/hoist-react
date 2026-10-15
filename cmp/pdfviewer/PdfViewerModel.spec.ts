/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PdfViewerModel, type PdfViewerConfig} from '@xh/hoist/cmp/pdfviewer';
import {XH} from '@xh/hoist/core';
import {wait} from '@xh/hoist/promise';
import {hoistCore, hoistError, initTestAppAsync} from '@xh/hoist/test-support';
import {reaction, when} from 'mobx';
import {WorkerMessageHandler} from 'pdfjs-dist/legacy/build/pdf.worker.mjs';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * How PdfViewerModel loads documents: each source type, buffer handling, error reporting, and
 * the race between a new source and a load still in progress. These run against real pdf.js,
 * loaded through `loadPdfJsAsync()`. jsdom has no layout or canvas, so the viewer itself - paging,
 * zoom, find - is left to browser tests.
 */
describe('PdfViewerModel', () => {
    beforeAll(async () => {
        // jsdom has no Worker. Run pdf.js's worker code in this thread, over a message channel.
        // Assigned rather than stubbed with vi.stubGlobal(), which is undone after each test.
        globalThis.Worker = class {
            constructor() {
                const {port1, port2} = new MessageChannel();
                WorkerMessageHandler.initializeFromPort(port2);
                port1.start();
                port2.start();
                return port1;
            }
        } as any;
        await initTestAppAsync();
    });

    describe('loading', () => {
        it('loads a URL source through XH.fetch, relative to XH.baseUrl', async () => {
            hoistCore.route('GET', 'docs/1', () => pdfResponse(3));
            const model = create({source: 'docs/1'});
            await loadedAsync(model);

            expect(model.pageCount).toBe(3);
            expect(hoistCore.requestsTo('docs/1')).toHaveLength(1);
        });

        it('sends a FetchOptions source as given', async () => {
            hoistCore.route('POST', 'docs/render', () => pdfResponse(2));
            const model = create({source: {url: 'docs/render', params: {template: 'invoice'}}});
            await loadedAsync(model);

            expect(model.pageCount).toBe(2);
            expect(hoistCore.requestsTo('docs/render')[0].form).toEqual({template: 'invoice'});
        });

        // pdf.js transfers the bytes it parses to its worker, which would empty the app's buffer.
        it.each([
            ['Uint8Array', () => pdfBytes(2)],
            ['ArrayBuffer', () => pdfBytes(2).buffer]
        ])('leaves an app-owned %s intact and reusable', async (_, makeSource) => {
            const source = makeSource(),
                {byteLength} = source;

            const first = create({source});
            await loadedAsync(first);
            expect(source.byteLength).toBe(byteLength);

            const second = create({source});
            await loadedAsync(second);
            expect(second.pageCount).toBe(2);
        });

        it('closes the previous document when the source changes or clears', async () => {
            const model = create({source: pdfBytes(1)});
            await loadedAsync(model);
            const first = model.pdfDocument;

            model.setSource(pdfBytes(2));
            await loadedAsync(model);
            expect(first.loadingTask.destroyed).toBe(true);
            expect(model.pageCount).toBe(2);

            const second = model.pdfDocument;
            model.setSource(null);
            await loadedAsync(model);
            expect(second.loadingTask.destroyed).toBe(true);
            expect(model.hasDocument).toBe(false);
        });
    });

    describe('a newer source', () => {
        it('wins over a slower load still in progress', async () => {
            routeSlow(3);
            const model = create({source: 'docs/slow'}),
                pageCounts = recordPageCounts(model);
            await requestedAsync('docs/slow');

            model.setSource(pdfBytes(1));
            await loadedAsync(model);

            expect(model.pageCount).toBe(1);
            expect(pageCounts).not.toContain(3);
        });

        // BUG: LoadSupport sets `lastLoadException` when any load finishes, stale ones included.
        // The stale load clears the newer load's error, and the viewer shows neither an error
        // nor a document. Affects every Loadable - the fix belongs in LoadSupport. See #4857.
        it.fails('keeps its load error when a stale load finishes later', async () => {
            routeSlow(3);
            const model = create({source: 'docs/slow'});
            await requestedAsync('docs/slow');

            model.setSource(notAPdf());
            await loadedAsync(model);

            expect(model.hasDocument).toBe(false);
            expect(model.lastLoadException).not.toBeNull();
        });
    });

    describe('load errors', () => {
        it('reports a failed load on the model, without an alert', async () => {
            const handleException = vi.spyOn(XH, 'handleException');
            hoistCore.route('GET', 'docs/missing', () =>
                hoistError(404, {name: 'NotFoundException', message: 'No such document'})
            );
            const model = create({source: 'docs/missing'});
            await loadedAsync(model);

            expect(model.hasDocument).toBe(false);
            expect(model.lastLoadException.message).toBe('No such document');
            expect(handleException).toHaveBeenCalledWith(
                model.lastLoadException,
                expect.objectContaining({showAlert: false})
            );
        });

        it('reports bytes that are not a PDF', async () => {
            const model = create({source: notAPdf()});
            await loadedAsync(model);

            expect(model.hasDocument).toBe(false);
            expect(model.lastLoadException?.name).toBe('InvalidPDFException');
        });

        // The viewer's Retry button calls refreshAsync().
        it('loads the same source again on refresh', async () => {
            let fail = true;
            hoistCore.route('GET', 'docs/flaky', () =>
                fail ? hoistError(503, {message: 'Try again'}) : pdfResponse(2)
            );
            const model = create({source: 'docs/flaky'});
            await loadedAsync(model);
            expect(model.lastLoadException).not.toBeNull();

            fail = false;
            await model.refreshAsync();

            expect(model.lastLoadException).toBeNull();
            expect(model.pageCount).toBe(2);
        });
    });

    it('drops a load in progress when destroyed', async () => {
        routeSlow(1);
        const model = new PdfViewerModel({source: 'docs/slow'});
        await requestedAsync('docs/slow');

        model.destroy();
        await hoistCore.settleAsync();
        await wait(50);

        expect(model.pdfDocument).toBeNull();
    });

    describe('downloadFilename', () => {
        beforeAll(() => {
            hoistCore.route('*', 'files/:name', () => pdfResponse(1));
        });

        it.each([
            ['an explicit filename', {source: 'files/a.pdf', filename: 'b.pdf'}, 'b.pdf'],
            ['a URL ending in .pdf', {source: 'files/report.pdf?v=2#page=3'}, 'report.pdf'],
            ['a FetchOptions URL', {source: {url: 'files/report.pdf'}}, 'report.pdf'],
            ['an encoded URL', {source: 'files/Q3%20report.pdf'}, 'Q3 report.pdf'],
            ['a URL with no filename', {source: 'files/42'}, 'document.pdf'],
            ['a File', {source: new File([pdfBytes(1)], 'scan.pdf')}, 'scan.pdf'],
            ['a Blob', {source: new Blob([pdfBytes(1)])}, 'document.pdf']
        ] as [string, PdfViewerConfig, string][])('uses %s', async (_, config, expected) => {
            const model = create(config);
            await loadedAsync(model);
            expect(model.downloadFilename).toBe(expected);
        });
    });
});

//------------------
// Helpers
//------------------
function create(config: PdfViewerConfig): PdfViewerModel {
    const model = new PdfViewerModel(config);
    onTestFinished(() => model.destroy());
    return model;
}

/** Wait for the fake server to answer, then for the model's latest load to finish. */
async function loadedAsync(model: PdfViewerModel) {
    await hoistCore.settleAsync();
    await when(() => !model.loadObserver.isPending);
    // Let any stale load still in progress finish too, so a test sees its effect.
    await wait(150);
}

/** Serve `docs/slow` after a delay, so a test can act while its load is in progress. */
function routeSlow(pageCount: number) {
    hoistCore.route('GET', 'docs/slow', async () => {
        await wait(100);
        return pdfResponse(pageCount);
    });
}

/** Wait for the model's request to reach the fake server, which has yet to answer it. */
async function requestedAsync(path: string) {
    await vi.waitFor(() => expect(hoistCore.requestsTo(path)).toHaveLength(1));
}

/** Every page count the model shows, from now until the test ends. */
function recordPageCounts(model: PdfViewerModel): number[] {
    const ret: number[] = [],
        dispose = reaction(
            () => model.pageCount,
            count => ret.push(count)
        );
    onTestFinished(dispose);
    return ret;
}

/** A minimal valid PDF with blank pages. */
function pdfBytes(pageCount: number): Uint8Array<ArrayBuffer> {
    const pageIds = Array.from({length: pageCount}, (_, i) => i + 3),
        objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`,
            ...pageIds.map(() => '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>')
        ];

    let pdf = '%PDF-1.4\n';
    const offsets = objects.map((obj, i) => {
        const offset = pdf.length;
        pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
        return offset;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach(offset => (pdf += `${String(offset).padStart(10, '0')} 00000 n \n`));
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return encode(pdf);
}

function pdfResponse(pageCount: number): Response {
    return new Response(pdfBytes(pageCount), {headers: {'Content-Type': 'application/pdf'}});
}

function notAPdf(): Uint8Array<ArrayBuffer> {
    return encode('Not a PDF');
}

// Under jsdom, TextEncoder returns a Uint8Array from another realm, which fails `instanceof`.
function encode(s: string): Uint8Array<ArrayBuffer> {
    return Uint8Array.from(new TextEncoder().encode(s));
}
