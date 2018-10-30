/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {isPlainObject, isObject, difference, isEmpty, pull, pullAllWith, isEqual} from 'lodash';
import {observable, action} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

@HoistModel
export class DimensionChooserModel {

    @observable.ref dimensions = null;
    @observable.ref selectedDims = null;
    maxHistoryLength = null;
    maxDepth = null;

    //-------------------------
    // Popover rendering
    //-------------------------
    @observable isMenuOpen = false;
    @action
    setPopoverDisplay(bool) {
        this.isMenuOpen = bool;
    }

    @observable displayHistoryItems = true;
    @action
    setDisplayHistory(bool) {
        this.displayHistoryItems = bool;
    }

    constructor(
        {
            dimensionOptions,
            maxHistoryLength = 5,
            maxDepth
        }) {
        this.dimensionOptions = this.normalizeDimensions(dimensionOptions);
        this.maxHistoryLength = maxHistoryLength;
        this.maxDepth = withDefault(maxDepth, this.dimensionOptions.length);

        this.allDims = this.dimensionOptions.map(d => d.value);

        const prefs = this.loadPrefs();

        this.defaultDims = prefs.defaultDims || [this.allDims[0]];
        this.selectedDims = this.defaultDims;

        this.history = prefs.initialValue ? [...prefs.initialValue] : [[this.allDims[0]]];

        this.dimensions = this.defaultDims;
    }

    @action
    addDim(dim, i) {
        const copy = this.selectedDims.slice();

        pull(copy, dim);
        copy[i] = dim;
        if (this.toRichDim(dim).isLeafColumn) copy.splice(i + 1);

        this.selectedDims = copy;
    }

    @action
    removeDim(dim) {
        const copy = this.selectedDims.slice();
        pull(copy, dim);
        this.selectedDims = copy;
    }

    @action
    setDims(type) {
        switch (type) {
            case 'restore default':
                this.selectedDims = this.defaultDims;
                this.saveDimensions();
                break;
            case 'last commit':
                this.selectedDims = this.dimensions;
                this.setDisplayHistory(true);
                break;
            case 'new default':
                this.defaultDims = this.dimensions;
                if (XH.prefService.hasKey('xhDimensionsDefault')) XH.prefService.set('xhDimensionsDefault', this.defaultDims);
                break;
        }
    }

    @action
    setDimsFromHistory(idx) {
        this.selectedDims = this.history[idx];
        this.saveDimensions();
    }

    @action
    saveDimensions() {
        const {selectedDims} = this;

        this.dimensions = selectedDims;
        this.saveHistory(selectedDims);

        this.setPopoverDisplay(false);
        this.setDisplayHistory(true);
    }


    //-------------------------
    // Implementation
    //-------------------------

    loadPrefs() {
        let defaultDims, initialValue = null;
        if (XH.prefService.hasKey('xhDimensionsHistory')) {
            const history = XH.prefService.get('xhDimensionsHistory');
            if (Object.keys(history).length) {
                initialValue = history;
                defaultDims = history[0];
            }
        }

        // if (XH.prefService.hasKey('xhDimensionsDefault')) {
        //     const defaults = XH.prefService.get('xhDimensionsDefault');
        //     if (Object.keys(defaults).length) defaultDims = defaults;
        // }

        return {defaultDims, initialValue};
    }

    saveHistory(newDims) {
        const {history} = this;

        if (isEmpty(newDims)) return;                                    // Don't save empty dimensions array
        pullAllWith(history, [newDims], isEqual);                       // Remove duplicates
        if (history.length >= this.maxHistoryLength) history.pop();     // Don't allow to go over max history length

        history.unshift(newDims);
        if (XH.prefService.hasKey('xhDimensionsHistory')) XH.prefService.set('xhDimensionsHistory', history);
    }


    //-------------------------
    // Render helpers
    //-------------------------
    get leafSelected() {
        return this.dimensionOptions.filter((dim) => this.selectedDims.slice().includes(dim.value) &&
            dim.isLeafColumn).length > 0;
    }

    get remainingDims() {
        return this.toRichDim(difference(this.allDims, this.selectedDims));
    }

    availableDims = (i) => {
        const dimChildren = this.toRichDim(this.selectedDims.slice(i + 1));
        return [...this.remainingDims, ...dimChildren];
    }

    //-------------------------
    // Value handling
    //-------------------------

    toRichDim = (value) => {
        const {dimensionOptions} = this,
            retFn = (val) => dimensionOptions.find(dim => dim.value === val);
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