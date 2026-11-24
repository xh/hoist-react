/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistModel} from '@xh/hoist/core';
import type {PdfScale, PdfViewerToolbarItem} from '../Types';

/**
 * The members of {@link PdfViewerModel} that the platform toolbars use.
 *
 * Every app's AppContainer loads the toolbars. Typing them against this interface, not the model,
 * keeps `tsc` from reaching the model's pdf.js imports in apps that do not install `pdfjs-dist`.
 *
 * @internal
 */
export interface PdfViewerToolbarModel extends HoistModel {
    readonly toolbar: PdfViewerToolbarItem[];
    readonly hasDocument: boolean;

    readonly pageNumber: number;
    readonly pageCount: number;
    readonly canGoNext: boolean;
    readonly canGoPrevious: boolean;
    goToPage(pageNumber: number): void;
    nextPage(): void;
    previousPage(): void;

    readonly scale: PdfScale;
    setScale(scale: PdfScale): void;
    zoomIn(): void;
    zoomOut(): void;
    rotate(degrees?: number): void;

    readonly findQuery: string;
    readonly findMatchCount: number;
    readonly findMatchNumber: number;
    readonly isFinding: boolean;
    findAsync(query: string): Promise<unknown>;
    findNext(): void;
    findPrevious(): void;

    downloadAsync(): Promise<void>;
}
