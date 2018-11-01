/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {isString, difference, isEmpty, without, pullAllWith, isEqual, keys} from 'lodash';
import {observable, action, bindable} from '@xh/hoist/mobx';
import {throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';

@HoistModel
export class DimensionChooserModel {

    @observable.ref value = null;

    // Immutable properties
    maxHistoryLength = null;
    maxDepth = null;
    historyPreference = null;
    dimensions = null;
    dimensionVals = null;

    // Internal state
    history = null;
    @observable.ref pendingValue = null;

    //-------------------------
    // Popover rendering
    //-------------------------
    @bindable isMenuOpen = false;
    @bindable isAddNewOpen = false;

    constructor({
        dimensions,
        defaultValue,
        historyPreference,
        maxHistoryLength = 5,
        maxDepth = 4
    }) {
        this.maxHistoryLength = maxHistoryLength;
        this.maxDepth = maxDepth;
        this.historyPreference = historyPreference;

        this.dimensions = this.normalizeDimensions(dimensions);
        this.dimensionVals = keys(this.dimensions);

        const history = this.loadHistory();
        this.history = isEmpty(history) ?
            withDefault([defaultValue], [[this.dimensionVals[0]]]) :
            history;

        this.value = this.history[0];
        this.pendingValue = [];
    }

    @action
    setValue(value) {
        // Validate?
        this.value = value;
        this.addToHistory(value);
    }

    //---------------------------------
    // Edit methods for add menu
    //---------------------------------
    @action
    addPendingDim(dim, i) {
        const newValue = without(this.pendingValue, dim);
        newValue[i] = dim;
        if (this.dimensions[dim].leaf) newValue.splice(i + 1);

        this.pendingValue = newValue;
    }

    @action
    removePendingDim(dim) {
        this.pendingValue = without(this.pendingValue, dim);
    }

    @action
    commitPendingValue() {
        this.setValue(this.pendingValue);
        this.setIsMenuOpen(false);
    }

    //------------------------------
    // Render Helpers for add menu
    //-------------------------------
    get leafInPending() {
        this.pendingValue.some(dim => this.dimensions[dim].leaf);
    }

    dimOptionsForLevel(level) {
        const remainingDims = difference(this.dimensionVals, this.pendingValue);
        const childDims = this.pendingValue.slice(level + 1) || [];
        return [...remainingDims, ...childDims].map(it => this.dimensions[it]);
    }

    //-------------------------
    // Implementation
    //-------------------------
    loadHistory() {
        const {historyPreference} = this,
            {prefService} = XH;
        warnIf(
            !prefService.hasKey(historyPreference),
            `Dimension Chooser failed to load user history: '${historyPreference}'`
        );

        return prefService.get(historyPreference, null);
    }

    addToHistory(value) {
        const {history, historyPreference} = this,
            {prefService} = XH;

        pullAllWith(history, [value], isEqual);                         // Remove duplicates

        history.unshift(value);
        if (history.length > this.maxHistoryLength) history.pop();     // trim if needed

        if (prefService.hasKey(historyPreference)) {
            prefService.set(historyPreference, history);
        }
    }

    //-------------------------
    // Value handling
    //-------------------------
    normalizeDimensions(dims) {
        dims = dims || [];
        const ret = {};
        dims.forEach(it => {
            const dim = this.createDimension(it);
            ret[dim.value] = dim;
        });
        return ret;
    }

    createDimension(src) {
        src = isString(src) ? {value: src} : src;

        throwIf(
            !src.hasOwnProperty('value'),
            "Dimensions provided as Objects must define a 'value' property."
        );

        return {label: src.value, leaf: false, ...src};
    }

}