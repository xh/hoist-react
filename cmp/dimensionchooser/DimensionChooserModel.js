/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {HoistModel, XH} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {warnIf, throwIf} from '@xh/hoist/utils/js';
import {
    cloneDeep,
    compact,
    difference,
    isArray,
    isEmpty,
    isEqual,
    isString,
    every,
    keys,
    pullAllWith,
    sortBy,
    without
} from 'lodash';

/**
 * This model is responsible for managing the state of a DimensionChooser component,
 * which allows a user to a list of dimensions for any grouping based API. It produces an
 * observable list of strings which represents a dimension grouping.
 *
 * To connect this model to an application:
 *  1) Create a new instance of this model with a list of dimensions.
 *  2) To persist value & history, create an application preference with type 'JSON' and
 *     pass its key to this model.
 *  3) Track this model's 'value' property and fetch new data when it updates.
 */
@HoistModel
export class DimensionChooserModel {

    @observable.ref value = null;

    // Immutable properties
    maxHistoryLength = null;
    maxDepth = null;
    preference = null;
    dimensions = null;
    dimensionVals = null;
    enableClear = false;

    // Internal state
    history = [];
    @observable.ref pendingValue = [];

    //-------------------------
    // Popover rendering
    //-------------------------
    @bindable isMenuOpen = false;
    @bindable showAddSelect = false;
    @bindable activeMode = 'history'; // history vs. edit

    /**
     * @param c - DimensionChooserModel configuration.
     * @param {string[]|Object[]} c.dimensions - dimensions available for selection. The object
     *      form supports value, label, and leaf keys, where `leaf: true` indicates that the
     *      dimension does not support any further sub-groupings.
     * @param {string[]} [c.initialValue] - initial dimensions if history empty / not configured.
     * @param {string} [c.preference] - preference key used to persist the user's last value
     *      and most recently selected groupings for easy re-selection.
     * @param {number} [c.maxHistoryLength] - number of recent selections to maintain in the user's
     *      history (maintained automatically by the control on a FIFO basis).
     * @param {number} [c.maxDepth] - maximum number of dimensions allowed in a single grouping.
     * @param {boolean} [c.enableClear] - Support clearing the control by removing all dimensions?
     */
    constructor({
        dimensions,
        initialValue,
        preference,
        maxHistoryLength = 5,
        maxDepth = 4,
        enableClear = false
    }) {
        this.maxHistoryLength = maxHistoryLength;
        this.maxDepth = maxDepth;
        this.enableClear = enableClear;
        this.preference = preference;

        this.dimensions = this.normalizeDimensions(dimensions);
        this.dimensionVals = keys(this.dimensions);

        this.history = this.loadHistory();
        this.value = this.pendingValue = this.getInitialValue(initialValue);
    }

    @action
    setValue(value) {
        if (!this.validateValue(value)) {
            console.warn('Attempted to set DimChooser to invalid value: ' + value);
            return;
        }
        this.value = value;
        this.addToHistory(value);
        this.setPref();
    }

    showHistory() {
        this.setActiveMode('history');
    }

    @action
    showEditor() {
        this.pendingValue = this.value;
        this.setShowAddSelect(false);
        this.setActiveMode('edit');
    }

    showMenu() {
        if (isEmpty(this.history)) {
            this.showEditor();
        } else {
            this.showHistory();
        }
        this.setIsMenuOpen(true);
    }

    closeMenu() {
        this.setIsMenuOpen(false);
    }


    //------------------------
    // Editor support
    //------------------------
    @action
    addPendingDim(dim, level) {
        const newValue = without(this.pendingValue, dim);               // Ensure the new dimension hasn't been selected at another level
        newValue[level] = dim;                                          // Insert the new dimension
        if (this.dimensions[dim].leaf) newValue.splice(level + 1);      // If it's a leaf dimension, remove any subordinate dimensions

        this.pendingValue = newValue;                                   // Update intermediate state
        this.setShowAddSelect(false);
    }

    @action
    removePendingDim(dim) {
        this.pendingValue = without(this.pendingValue, dim);
    }

    @action
    commitPendingValueAndClose() {
        this.setValue(this.pendingValue);
        this.closeMenu();
    }

    // True if a leaf-level dim has been specified via the editor - any further child groupings
    // would be derivative at this point and should not be allowed by the UI.
    get leafInPending() {
        return this.pendingValue.some(dim => this.dimensions[dim].leaf);
    }

    // Returns options passed to the select control at each level of the add menu.
    // Pass current value as second arg to ensure included - used when editing a level (vs. adding).
    dimOptionsForLevel(level, currDimVal = null) {
        // Dimensions which do not appear in the add menu
        const remainingDims = difference(this.dimensionVals, this.pendingValue);

        // Dimensions subordinate to this one in the tree hierarchy
        const childDims = this.pendingValue.slice(level + 1) || [];

        const ret = compact([...remainingDims, ...childDims, currDimVal]).map(it => this.dimensions[it]);
        return sortBy(ret, 'label');
    }


    //-------------------------
    // Implementation
    //-------------------------
    loadHistory() {
        const pref = this.getPref(),
            history = pref && pref.history ? pref.history : [];

        return isEmpty(history) ? [] : history.filter(v => this.validateValue(v));
    }

    validateValue(value) {
        return (
            isArray(value) &&
            (
                (isEmpty(value) && this.enableClear) ||
                (!isEmpty(value) && value.every(h => this.dimensionVals.includes(h)))
            )
        );
    }

    addToHistory(value) {
        const {history} = this;

        pullAllWith(history, [value], isEqual); // Remove duplicates
        history.unshift(value);
        if (history.length > this.maxHistoryLength) history.pop();

        this.setPref();
    }

    //-------------------------
    // Value handling
    //-------------------------
    getInitialValue(initialValue) {
        // Set control's initial value with priorities
        // preference -> history -> initialValue -> 1st item or []
        const {history, dimensionVals, enableClear} = this,
            pref = this.getPref();

        if (pref && pref.value) return pref.value;
        if (!isEmpty(history)) return history[0];
        if (this.validateValue(initialValue)) return initialValue;
        return enableClear || isEmpty(dimensionVals) ? [] : [dimensionVals[0]];
    }

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

    //-------------------------
    // Preference handling
    //-------------------------
    getPref() {
        warnIf(this.historyPreference, 'Dimension Chooser "historyPreference" has been deprecated and will be ignored. Use "preference" instead.');

        const {preference} = this;
        if (!preference) return null;

        throwIf(!XH.prefService.hasKey(preference), `Dimension Chooser configured with missing preference key: '${preference}'`);

        // The following migration code allows us to use previously existing history preferences
        const ret = cloneDeep(XH.getPref(preference)),
            isHistoryPref = isArray(ret) && every(ret, it => isArray(it));

        return isHistoryPref ? {value: null, history: ret} : ret;
    }

    setPref() {
        const {preference, value, history} = this;
        if (!preference || !XH.prefService.hasKey(preference)) return;

        const data = {value};
        if (history.length) data.history = history;

        if (!isEmpty(data)) XH.setPref(preference, data);
    }

}