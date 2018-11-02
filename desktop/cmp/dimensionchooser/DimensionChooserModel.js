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

/**
 * This model is responsible for managing the state of a DimensionChooser component,
 * which allows the user to control the hierarchy of a Grid's tree column. It exposes a 'value',
 * an observable list of strings which represents a dimension grouping.
 *
 * To connect this model to an application:
 *  1) Create a new instance of this model with a list of dimensions corresponding to
 *  the grid's tree column.
 *  2) To persist user history, create a application preference with type 'JSON' and
 *  pass its name as a string to this model.
 *  3) Track this model's value and fetch new data when it updates.
 */

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

    /**
     *
     * @param {string[]|Object[]} dimensions - possible dimensions on which to set the grid.
     *      Object accepts value, label, and leaf keys, where leaf: true indicates a leafColumn.
     * @param {string[]} initialValue - Initial value of the control if no user history is found.
     * @param {string} historyPreference - UserPreference key used to persist grouping history.
     * @param {number} maxHistoryLength - dimension groupings to save. Default is 5.
     * @param {number} maxDepth - dimensions allowed in a single grouping.
     */

    constructor({
        dimensions,
        initialValue,
        historyPreference,
        maxHistoryLength = 5,
        maxDepth = 4
    }) {
        this.maxHistoryLength = maxHistoryLength;
        this.maxDepth = maxDepth;
        this.historyPreference = historyPreference;

        this.dimensions = this.normalizeDimensions(dimensions);
        this.dimensionVals = keys(this.dimensions);

        const history = this.loadHistory(),
            defaultVal = initialValue ? [initialValue] : [[this.dimensionVals[0]]];
        this.history = isEmpty(history) ? defaultVal : history;

        this.value = this.history[0];
        this.pendingValue = [];
        console.log(this)
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