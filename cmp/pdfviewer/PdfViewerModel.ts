/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, LoadSpec, PersistOptions, XH} from '@xh/hoist/core';
import {loadPdfJsAsync, PdfJs} from '@xh/hoist/kit/pdfjs';
import {action, bindable, computed, observable, observableRef, runInAction} from '@xh/hoist/mobx';
import type {FetchOptions} from '@xh/hoist/svc';
import {downloadBlob, throwIf, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {clamp, isNumber, isString} from 'lodash';
import type {PDFDocumentLoadingTask, PDFDocumentProxy} from 'pdfjs-dist/legacy/build/pdf.mjs';
import type {EventBus, PDFLinkService, PDFViewer} from 'pdfjs-dist/legacy/web/pdf_viewer.mjs';
import type {ReactNode} from 'react';
import type {PdfScale, PdfSource, PdfViewerToolbarItem, PdfViewerToolbarSpec} from './Types';

export interface PdfViewerConfig {
    /** The document to display. See {@link PdfViewerModel.setSource}. */
    source?: PdfSource;

    /** Filename for downloads. Defaults to the last segment of a URL source, or 'document.pdf'. */
    filename?: string;

    /** Initial zoom level. Default 'page-width'. */
    scale?: PdfScale;

    /** Toolbar items to display, or false to hide. Default true. See {@link PdfViewerToolbarSpec}. */
    toolbar?: PdfViewerToolbarSpec;

    /** Content to display when there is no document. Default 'No document to display.' */
    emptyText?: ReactNode;

    /** Options to persist the user's chosen zoom level. */
    persistWith?: PersistOptions;

    /** See {@link HoistBase.xhName}. */
    xhName?: string;
}

export interface PdfViewerModelDefaults {
    /** Default toolbar items for desktop apps. */
    toolbar?: PdfViewerToolbarItem[];
    /** Default toolbar items for mobile apps. */
    mobileToolbar?: PdfViewerToolbarItem[];
}

/**
 * Model for a {@link PdfViewer}, built on Mozilla's pdf.js. Loads a document from a URL, a
 * {@link FetchOptions} object, or bytes held by the app, and exposes observable state and
 * actions for page navigation, zoom, rotation, find, and download.
 *
 * Bind any of these to custom controls, or drive the viewer programmatically - the built-in
 * toolbar is implemented entirely on this public API.
 *
 * Requires the app to add `pdfjs-dist` to its own dependencies. See the package README.
 *
 * @see PdfViewer
 */
export class PdfViewerModel extends HoistModel {
    /** App-level defaults for PdfViewerModel. Instance config takes precedence. */
    static defaults: PdfViewerModelDefaults = {
        toolbar: ['pageNav', '-', 'zoom', '-', 'find', 'filler', 'rotate', 'download'],
        mobileToolbar: ['pageNav', 'filler', 'zoom', 'download']
    };

    /** The document being displayed. */
    @observableRef accessor source: PdfSource = null;

    /** The loaded pdf.js document, for direct access to its API. Null until loaded. */
    @observableRef accessor pdfDocument: PDFDocumentProxy = null;

    /** Current page number, from 1. Tracks scrolling - call {@link goToPage} to change. */
    @observable accessor pageNumber: number = 1;

    /** Requested zoom level - a preset or a number. Call {@link setScale} to change. */
    @observable accessor scale: PdfScale;

    /** Effective numeric scale, as resolved from {@link scale} for the current viewer size. */
    @observable accessor currentScale: number = 1;

    /** Page rotation in degrees - 0, 90, 180, or 270. */
    @observable accessor rotation: number = 0;

    /** Current find query. Matches are highlighted as the query changes. */
    @bindable accessor findQuery: string = '';

    /** Count of find matches across the document. */
    @observable accessor findMatchCount: number = 0;

    /** Index of the selected find match, from 1. Zero if no matches. */
    @observable accessor findMatchNumber: number = 0;

    filename: string;
    emptyText: ReactNode;
    toolbar: PdfViewerToolbarItem[];

    get isPdfViewerModel(): boolean {
        return true;
    }

    /** Number of pages in the loaded document. */
    @computed
    get pageCount(): number {
        return this.pdfDocument?.numPages ?? 0;
    }

    /** True if a document is loaded and ready to display. */
    @computed
    get hasDocument(): boolean {
        return !!this.pdfDocument;
    }

    /** True if a document is set, whether or not it has loaded. */
    get hasSource(): boolean {
        return this.source != null;
    }

    /** @internal - scroll container for the pdf.js viewer, set by the component. */
    containerRef = createObservableRef<HTMLDivElement>();

    private pdfJs: PdfJs = null;
    private loadingTask: PDFDocumentLoadingTask = null;
    private viewer: PDFViewer = null;
    private linkService: PDFLinkService = null;
    private eventBus: EventBus = null;
    private eventsAbort: AbortController = null;

    constructor(config: PdfViewerConfig = {}) {
        super();
        const {source = null, filename, scale, toolbar, emptyText, persistWith, xhName} = config;

        this.xhName = xhName;
        this.filename = filename ?? null;
        this.scale = withDefault(scale, 'page-width');
        this.toolbar = this.parseToolbar(withDefault(toolbar, true));
        this.emptyText = withDefault(emptyText, 'No document to display.');

        if (persistWith) {
            this.persistWith = persistWith;
            this.markPersist('scale');
        }

        this.source = source;

        this.addReaction(
            {
                track: () => this.source,
                // Load errors display inline - see `lastLoadException`.
                run: () => this.loadAsync().catchDefault({showAlert: false, logOnServer: false}),
                fireImmediately: true
            },
            {
                track: () => [this.containerRef.current, this.pdfDocument],
                run: ([container, doc]) =>
                    this.syncViewer(container as HTMLDivElement, doc as PDFDocumentProxy)
            },
            {
                track: () => this.findQuery,
                run: () => this.dispatchFind(),
                debounce: 200
            }
        );
    }

    //------------------
    // Document
    //------------------
    /** Set the document to display. Pass null to clear. */
    @action
    setSource(source: PdfSource) {
        this.source = source;
    }

    /** Download the loaded document. */
    async downloadAsync() {
        const {pdfDocument} = this;
        if (!pdfDocument) return;

        const data = await pdfDocument.getData();
        downloadBlob(
            new Blob([data as BlobPart], {type: 'application/pdf'}),
            this.downloadFilename
        );
    }

    /** Filename used by {@link downloadAsync}. */
    get downloadFilename(): string {
        if (this.filename) return this.filename;

        const {source} = this,
            url = isString(source) ? source : (source as FetchOptions)?.url,
            lastSegment = isString(url) ? url.split(/[?#]/)[0].split('/').pop() : null;
        if (lastSegment?.toLowerCase().endsWith('.pdf')) return lastSegment;

        return source instanceof File ? source.name : 'document.pdf';
    }

    //------------------
    // Navigation
    //------------------
    /** Scroll to a page, from 1. Out-of-range values are clamped. */
    goToPage(pageNumber: number) {
        const {viewer, pageCount} = this;
        if (!viewer || !pageCount) return;
        viewer.currentPageNumber = clamp(Math.round(pageNumber), 1, pageCount);
    }

    nextPage() {
        this.viewer?.nextPage();
    }

    previousPage() {
        this.viewer?.previousPage();
    }

    get canGoNext(): boolean {
        return this.pageNumber < this.pageCount;
    }

    get canGoPrevious(): boolean {
        return this.pageNumber > 1;
    }

    //------------------
    // Zoom and rotation
    //------------------
    /** Set the zoom level. */
    @action
    setScale(scale: PdfScale) {
        this.scale = scale;
        this.applyScale();
    }

    zoomIn() {
        this.viewer?.increaseScale();
    }

    zoomOut() {
        this.viewer?.decreaseScale();
    }

    /** Rotate all pages by the given number of degrees - a multiple of 90. Default 90. */
    @action
    rotate(degrees: number = 90) {
        throwIf(
            degrees % 90 !== 0,
            `PdfViewerModel rotation must be a multiple of 90 - got ${degrees}.`
        );
        this.rotation = (((this.rotation + degrees) % 360) + 360) % 360;
        if (this.viewer) this.viewer.pagesRotation = this.rotation;
    }

    //------------------
    // Find
    //------------------
    /** Select and scroll to the next match for {@link findQuery}. */
    findNext() {
        this.dispatchFind('again', false);
    }

    /** Select and scroll to the previous match for {@link findQuery}. */
    findPrevious() {
        this.dispatchFind('again', true);
    }

    //------------------
    // Implementation
    //------------------
    override async doLoadAsync(loadSpec: LoadSpec) {
        const {source} = this;
        await this.closeDocumentAsync();
        if (source == null || this.isObsolete(loadSpec)) return;

        let pdfDocument: PDFDocumentProxy;
        try {
            this.pdfJs ??= await loadPdfJsAsync();
            const data = await this.getDataAsync(source, loadSpec);
            if (this.isObsolete(loadSpec)) return;

            // Assigned synchronously, so a newer load or destroy() always finds and destroys it.
            const {lib, worker, BinaryDataFactory} = this.pdfJs,
                loadingTask = lib.getDocument({data, worker, BinaryDataFactory});
            this.loadingTask = loadingTask;

            pdfDocument = await loadingTask.promise;
        } catch (e) {
            // A newer load or destroy() cancels this one - not an error.
            if (this.isObsolete(loadSpec)) return;
            throw e;
        }
        if (this.isObsolete(loadSpec)) return;

        runInAction(() => {
            this.pdfDocument = pdfDocument;
            this.pageNumber = 1;
            this.rotation = 0;
            this.findMatchCount = 0;
            this.findMatchNumber = 0;
        });
    }

    private isObsolete(loadSpec: LoadSpec): boolean {
        return loadSpec.isStale || this.isDestroyed;
    }

    private async getDataAsync(source: PdfSource, loadSpec: LoadSpec): Promise<Uint8Array> {
        // pdf.js transfers the buffer to its worker - copy app-owned bytes to leave them intact.
        if (source instanceof Uint8Array) return source.slice();
        if (source instanceof ArrayBuffer) return new Uint8Array(source.slice(0));
        if (source instanceof Blob) return new Uint8Array(await source.arrayBuffer());

        const opts = isString(source) ? {url: source} : source,
            response = await XH.fetch(opts, {loadSpec});
        return new Uint8Array(await response.arrayBuffer());
    }

    private async closeDocumentAsync() {
        // Clear first, so the viewer releases the document before pdf.js destroys it.
        runInAction(() => (this.pdfDocument = null));

        const {loadingTask} = this;
        this.loadingTask = null;
        await loadingTask?.destroy();
    }

    private syncViewer(container: HTMLDivElement, doc: PDFDocumentProxy) {
        if (this.viewer && this.viewer.container !== container) this.destroyViewer();
        if (!container || !doc) {
            this.viewer?.setDocument(null);
            return;
        }

        if (!this.viewer) this.createViewer(container);
        this.viewer.setDocument(doc);
        this.linkService.setDocument(doc);
    }

    private createViewer(container: HTMLDivElement) {
        const {EventBus, PDFFindController, PDFLinkService, PDFViewer, LinkTarget} =
                this.pdfJs.viewer,
            eventsAbort = new AbortController(),
            {signal} = eventsAbort,
            eventBus = new EventBus(),
            linkService = new PDFLinkService({eventBus, externalLinkTarget: LinkTarget.BLANK}),
            findController = new PDFFindController({eventBus, linkService}),
            viewer = new PDFViewer({
                container,
                eventBus,
                linkService,
                findController,
                removePageBorders: true
            });

        linkService.setViewer(viewer);

        eventBus.on('pagesinit', () => this.onPagesInit(), {signal});
        eventBus.on('pagechanging', e => this.onPageChanging(e), {signal});
        eventBus.on('scalechanging', e => this.onScaleChanging(e), {signal});
        eventBus.on('updatefindmatchescount', e => this.onFindMatchesCount(e), {signal});
        eventBus.on('updatefindcontrolstate', e => this.onFindMatchesCount(e), {signal});

        this.viewer = viewer;
        this.linkService = linkService;
        this.eventBus = eventBus;
        this.eventsAbort = eventsAbort;
    }

    private destroyViewer() {
        // Do not pass an `abortSignal` to PDFViewer for this. pdf.js would also abort its shared
        // text selection listeners, breaking selection in any other viewer still mounted.
        this.viewer?.setDocument(null);
        this.eventsAbort?.abort();
        this.viewer = null;
        this.linkService = null;
        this.eventBus = null;
        this.eventsAbort = null;
    }

    private onPagesInit() {
        this.applyScale();
        if (this.rotation) this.viewer.pagesRotation = this.rotation;
        if (this.findQuery) this.dispatchFind();
    }

    @action
    private onPageChanging({pageNumber}) {
        this.pageNumber = pageNumber;
    }

    @action
    private onScaleChanging({scale, presetValue}) {
        this.currentScale = scale;
        if (!presetValue) this.scale = scale;
    }

    @action
    private onFindMatchesCount({matchesCount}) {
        this.findMatchCount = matchesCount?.total ?? 0;
        this.findMatchNumber = matchesCount?.current ?? 0;
    }

    private applyScale() {
        const {viewer, scale} = this;
        if (!viewer?.pagesCount) return;
        if (isNumber(scale)) {
            viewer.currentScale = scale;
        } else {
            viewer.currentScaleValue = scale;
        }
    }

    private dispatchFind(type: '' | 'again' = '', findPrevious: boolean = false) {
        const {eventBus, findQuery} = this;
        if (!eventBus) return;

        if (!findQuery) {
            eventBus.dispatch('findbarclose', {source: this});
            this.onFindMatchesCount({matchesCount: null});
            return;
        }

        eventBus.dispatch('find', {
            source: this,
            type,
            query: findQuery,
            caseSensitive: false,
            entireWord: false,
            highlightAll: true,
            findPrevious,
            matchDiacritics: false
        });
    }

    /** @internal - called by the component when the viewer is resized or shown. */
    onResize() {
        // Re-fit for presets, which pdf.js does not do itself.
        if (!isNumber(this.scale)) this.applyScale();
    }

    private parseToolbar(spec: PdfViewerToolbarSpec): PdfViewerToolbarItem[] {
        if (spec === false) return null;
        if (spec === true) {
            const {defaults} = PdfViewerModel;
            return XH.isMobileApp ? defaults.mobileToolbar : defaults.toolbar;
        }
        return spec;
    }

    override destroy() {
        this.destroyViewer();
        this.closeDocumentAsync();
        super.destroy();
    }
}
