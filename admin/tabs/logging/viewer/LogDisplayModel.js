/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH, LoadSupport} from '@xh/hoist/core';
import {Ref} from '@xh/hoist/utils/react';
import {observable,  settable} from '@xh/hoist/mobx';

/**
 * @private
 */
@HoistModel
@LoadSupport
export class LogDisplayModel {

    firstRow = new Ref();
    lastRow = new Ref();

    @settable
    @observable.ref
    rows = [];

    constructor(parent) {
        this.parent = parent;
        this.addAutorun(this.syncTail);
    }
    
    get tailIsDisplayed() {
        const {lastRow} = this,
            rect = lastRow.value && lastRow.value.getBoundingClientRect();

        return rect && rect.bottom <= window.innerHeight;
    }
    
    getRowRef(idx, total) {
        if (idx === total - 1) {
            return this.lastRow.ref;
        } else if (idx === 0) {
            return this.firstRow.ref;
        }

        return undefined;
    }

    syncTail() {
        const {tail} = this.parent,
            rowElem = this[tail ? 'lastRow' : 'firstRow'].value;

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
                this.setRows(this.startLine ? response.content : response.content.reverse());
            })
            .catch(e => {
                // Show errors inline in the viewer vs. a modal alert or catchDefault().
                const msg = e.message || 'An unknown error occurred';
                this.setRows([[0, `Error: ${msg}`]]);
                console.error(e);
            });
    }
}
