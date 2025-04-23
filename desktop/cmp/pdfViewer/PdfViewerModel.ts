import {HoistModel} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {clamp} from 'lodash';
import {action, observable} from 'mobx';
import {PDFDocumentProxy} from 'pdfjs-dist';
import {pdfjs} from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export class PdfViewerModel extends HoistModel {
    @observable document: string | File | null;
    @bindable currentPage: number;
    @observable private _pageCount: number;

    constructor({initialDocument}: PdfViewerModelConfig = {}) {
        super();
        makeObservable(this);

        this.document = initialDocument ?? null;
        this._pageCount = 1;
        this.currentPage = 1;
    }

    //------------------------
    // Page Methods
    //------------------------

    get pageCount(): number {
        return this._pageCount;
    }

    @action
    toPrevPage() {
        this.setPage(this.currentPage - 1);
    }

    @action
    toNextPage() {
        this.setPage(this.currentPage + 1);
    }

    @action
    setPage(targetPage: number) {
        this.currentPage = clamp(targetPage, 1, this._pageCount);
    }

    //------------------------
    // Document Methods
    //------------------------

    @action
    onDocumentLoadSuccess(doc: PDFDocumentProxy): void {
        console.log(doc, doc.numPages);
        this._pageCount = doc.numPages;
        this.currentPage = 1;
    }
}

interface PdfViewerModelConfig {
    initialDocument?: string | File | null;
    // UI Config
}
