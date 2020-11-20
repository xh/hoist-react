/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {createObservableRef} from '@xh/hoist/utils/react';

/**
 * @private
 */
export class LogDisplayModel extends HoistModel {

    get isLoadSupport() {return true}

    firstRowRef = createObservableRef();
    lastRowRef = createObservableRef();

    @bindable.ref rows = [];

    constructor(parent) {
        super();
        this.parent = parent;
        this.addAutorun(this.syncTail);
    }

    get tailIsDisplayed() {
        const {lastRowRef} = this,
            rect = lastRowRef.current && lastRowRef.current.getBoundingClientRect();

        return rect && rect.bottom <= window.innerHeight;
    }

    getRowRef(idx, total) {
        if (idx === total - 1) {
            return this.lastRowRef;
        } else if (idx === 0) {
            return this.firstRowRef;
        }

        return undefined;
    }

    syncTail() {
        const {tail} = this.parent,
            rowElem = this[tail ? 'lastRowRef' : 'firstRowRef'].current;

        if (rowElem) rowElem.scrollIntoView();
    }

    async doLoadAsync(loadSpec) {
        const {parent} = this;

        if (!parent.file) {
            this.setRows([]);
            return;
        }

        return XH
            .fetchJson({
                url: 'logViewerAdmin/getFile',
                params: {
                    filename: parent.file,
                    startLine: parent.startLine,
                    maxLines: parent.maxLines,
                    pattern: parent.pattern
                },
                loadSpec
            })
            .then(response => {
                if (!response.success) throw new Error(response.exception);
                this.setRows(parent.startLine ? response.content : response.content.reverse());
            })
            .catch(e => {
                // Show errors inline in the viewer vs. a modal alert or catchDefault().
                const msg = e.message || 'An unknown error occurred';
                this.setRows([[0, `Error: ${msg}`]]);
                console.error(e);
            });
    }
}
