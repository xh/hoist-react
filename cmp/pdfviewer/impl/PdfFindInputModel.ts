/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import type {PdfViewerToolbarModel} from './PdfViewerToolbarModel';

/**
 * Local model for a toolbar find input. Holds the text as the user types, and runs a find once
 * typing pauses. Shows a query set by the app via `findAsync()`.
 *
 * @internal
 */
export class PdfFindInputModel extends HoistModel {
    override xhImpl = true;

    @bindable accessor query: string;

    private readonly viewerModel: PdfViewerToolbarModel;

    constructor(viewerModel: PdfViewerToolbarModel) {
        super();
        this.viewerModel = viewerModel;
        this.query = viewerModel.findQuery;

        this.addReaction(
            {
                track: () => viewerModel.findQuery,
                run: findQuery => (this.query = findQuery)
            },
            {
                track: () => this.query,
                // Skip the viewer's own query, so showing it does not search again.
                run: query => {
                    if (query !== viewerModel.findQuery) viewerModel.findAsync(query);
                },
                debounce: 200
            }
        );
    }
}
