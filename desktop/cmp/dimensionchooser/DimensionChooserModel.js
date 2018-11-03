/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {cloneDeep, isString, isArray, difference, isEmpty, without, pullAllWith, isEqual, keys} from 'lodash';
import {observable, action, bindable} from '@xh/hoist/mobx';
import {throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';

/**
 * This model is responsible for managing the state of a DimensionChooser component,
 * which allows a user to a list of dimensions for any grouping based API. It produces an
 * observable list of strings which represents a dimension grouping.
 *
 * To connect this model to an application:
 *  1) Create a new instance of this model with a list of dimensions.
 *  2) To persist user history, create an application preference with type 'JSON' and
 *  pass its key to this model.
 *  3) Track this model's 'value' property and fetch new data when it updates.
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
     * @param {string[]|Object[]} dimensions - possible dimensions.
     *      Each object accepts value, label, and leaf keys, where leaf: true indicates a leaf
     * @param {string[]} [initialValue] - Initial value of the control if no user history is found on the server.
     * @param {string} [historyPreference] - Preference key used to persist grouping history.
     * @param {number} [maxHistoryLength] - dimension groupings to save.
     * @param {number} [maxDepth] - dimensions allowed in a single grouping.
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

        // Set control's initial value with priorities 1) prefService 2) initialValue prop 3) 1st item in dimensions prop
        this.history = this.loadHistory();
        initialValue = withDefault(initialValue,  [this.dimensionVals[0]]);
        this.value = !isEmpty(this.history) ? this.history[0] : initialValue;
        this.pendingValue = [];
    }

    /** Update the control's value. */
    @action
    setValue(value) {
        this.value = value;
        this.addToHistory(value);
    }

    //---------------------------------
    // Edit methods for add menu
    //---------------------------------
    /** Add or replace a dimension in the add menu. */
    @action
    addPendingDim(dim, level) {
        const newValue = without(this.pendingValue, dim);               // Ensure the new dimension hasn't been selected at another level
        newValue[level] = dim;                                          // Insert the new dimension
        if (this.dimensions[dim].leaf) newValue.splice(level + 1);      // If it's a leaf dimension, remove any subordinate dimensions

        this.pendingValue = newValue;                                   // Update intermediate state
    }

    /** Remove a dimension from the add menu. */
    @action
    removePendingDim(dim) {
        this.pendingValue = without(this.pendingValue, dim);
    }

    /** Save add menu dimensions as the control's value. */
    @action
    commitPendingValue() {
        this.setValue(this.pendingValue);
        this.setIsMenuOpen(false);
    }

    //------------------------------
    // Render Helpers for add menu
    //-------------------------------
    /** Has a leaf column been selected in the add menu? */
    get leafInPending() {
        this.pendingValue.some(dim => this.dimensions[dim].leaf);
    }

    /** Options passed to the select control at each level of the add menu. */
    dimOptionsForLevel(level) {
        // Dimensions which do not appear in the add menu
        const remainingDims = difference(this.dimensionVals, this.pendingValue);
        // Dimensions subordinate to this one in the tree hierarchy
        const childDims = this.pendingValue.slice(level + 1) || [];
        return [...remainingDims, ...childDims].map(it => this.dimensions[it]);
    }

    //-------------------------
    // Implementation
    //-------------------------
    loadHistory() {
        const {historyPreference} = this,
            {prefService} = XH;

        throwIf(
            historyPreference && !prefService.hasKey(historyPreference),
            `Dimension Chooser configured with missing history preference key: '${historyPreference}'`
        );

        const history = historyPreference ? cloneDeep(prefService.get(historyPreference)) : [];
        return this.validateHistory(history);
    }

    validateHistory(history) {
        if (isEmpty(history) || !isArray(history[0])) return history;
        return history.filter(value => value.every(h => this.dimensionVals.includes(h)));
    }

    addToHistory(value) {
        const {history, historyPreference} = this,
            {prefService} = XH;

        pullAllWith(history, [value], isEqual); // Remove duplicates

        history.unshift(value);
        if (history.length > this.maxHistoryLength) history.pop();

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