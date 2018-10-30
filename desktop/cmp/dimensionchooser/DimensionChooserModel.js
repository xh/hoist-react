/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {isPlainObject, isObject, difference, isEmpty, without, pullAllWith, isEqual} from 'lodash';
import {observable, action, bindable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

@HoistModel
export class DimensionChooserModel {

    @observable.ref value = null;
    @observable.ref pendingDims = null;

    maxHistoryLength = null;
    maxDepth = null;
    dimensions = null;
    history = null;
    historyPreference = null;

    //-------------------------
    // Popover rendering
    //-------------------------
    @bindable isMenuOpen = false;
    @bindable isAddNewOpen = false;


    constructor({
        dimensions,
        defaultDims,
        historyPreference,
        maxHistoryLength = 5,
        maxDepth = 4
    }) {
        this.dimensions = this.normalizeDimensions(dimensions);
        this.maxHistoryLength = maxHistoryLength;
        this.maxDepth = maxDepth;

        this.allDims = this.dimensions.map(d => d.value);

        this.historyPreference = historyPreference;
        const historyFromPrefs = this.loadHistory();

        if (isEmpty(historyFromPrefs)) {
            console.warn('XH Dimension Chooser failed to load user history');
            this.history = withDefault(defaultDims, [[this.allDims[0]]]);
        } else {
            this.history = historyFromPrefs;
        }

        this.value = this.history[0];
        this.pendingDims = [];
    }

    @action
    addDim(dim, i) {
        const newDims = without(this.pendingDims, dim);
        newDims[i] = dim;
        if (this.toRichDim(dim).isLeafColumn) newDims.splice(i + 1);

        this.pendingDims = newDims;
    }

    @action
    removeDim(dim) {
        this.pendingDims = without(this.pendingDims, dim);
    }

    @action
    setDimsFromHistory(idx) {
        this.pendingDims = this.history[idx];
        this.commitPendingDims();
    }

    @action
    commitPendingDims() {
        const {pendingDims} = this;

        this.value = pendingDims;
        this.saveHistory(pendingDims);

        this.setIsMenuOpen(false);
    }


    //-------------------------
    // Implementation
    //-------------------------

    loadHistory() {
        return XH.prefService.get(this.historyPreference, null);
    }

    saveHistory(newDims) {
        const {history, historyPreference} = this;

        if (isEmpty(newDims)) return;                                    // Don't save empty dimensions array
        pullAllWith(history, [newDims], isEqual);                       // Remove duplicates
        if (history.length >= this.maxHistoryLength) history.pop();     // Don't allow to go over max history length

        history.unshift(newDims);
        if (XH.prefService.hasKey(historyPreference)) XH.prefService.set(historyPreference, history);
    }


    //-------------------------
    // Render helpers
    //-------------------------
    get leafSelected() {
        return this.dimensions.filter((dim) => this.pendingDims.slice().includes(dim.value) &&
            dim.isLeafColumn).length > 0;
    }

    get remainingDims() {
        return this.toRichDim(difference(this.allDims, this.pendingDims));
    }

    availableDims = (i) => {
        const dimChildren = this.toRichDim(this.pendingDims.slice(i + 1));
        return [...this.remainingDims, ...dimChildren];
    }

    //-------------------------
    // Value handling
    //-------------------------

    toRichDim = (value) => {
        const {dimensions} = this,
            retFn = (val) => dimensions.find(dim => dim.value === val);
        return isObject(value) ?
            value.map((it) => retFn(it)) :
            retFn(value);
    }

    normalizeDimensions(dims) {
        dims = dims || [];
        return dims.map(it => this.createDimension(it));
    }

    createDimension(src) {
        const srcIsObject = isPlainObject(src);

        throwIf(
            srcIsObject && !src.hasOwnProperty('value'),
            "Select options/values provided as Objects must define a 'value' property."
        );

        return srcIsObject ?
            {label: withDefault(src.label, src.value), isLeafColumn: withDefault(src.leaf, false), ...src} :
            {label: src != null ? src.toString() : '-null-', value: src, isLeafColumn: false};
    }

}