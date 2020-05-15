/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {
    cloneDeep,
    compact,
    difference,
    every,
    isArray,
    isEmpty,
    isEqual,
    isString,
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
    historyPreference = null;
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
     * @param {string} [c.preference] - preference key used to persist the user's last value.
     * @param {string} [c.historyPreference] - preference key used to persist the user's most
     *      recently selected groupings for easy re-selection. Will default to 'preference'. Set to
     *      null to not track history.
     * @param {number} [c.maxHistoryLength] - number of recent selections to maintain in the user's
     *      history (maintained automatically by the control on a FIFO basis).
     * @param {number} [c.maxDepth] - maximum number of dimensions allowed in a single grouping.
     * @param {boolean} [c.enableClear] - Support clearing the control by removing all dimensions?
     */
    constructor({
        dimensions,
        initialValue,
        preference,
        historyPreference = preference,
        maxHistoryLength = 5,
        maxDepth = 4,
        enableClear = false
    }) {
        this.maxHistoryLength = maxHistoryLength;
        this.maxDepth = maxDepth;
        this.enableClear = enableClear;
        this.preference = preference;
        this.historyPreference = historyPreference;

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
        this.setValuePref();
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
        if (this.historyPreference) this.history = this.loadHistory();

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
        const pref = this.getHistoryPref(),
            history = pref?.history ?? [];

        return history.filter(v => this.validateValue(v));
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

        this.setHistoryPref();
    }

    //-------------------------
    // Value handling
    //-------------------------
    getInitialValue(initialValue) {
        // Set control's initial value with priorities
        // preference -> initialValue -> 1st item or []
        const {dimensionVals, enableClear} = this,
            pref = this.getValuePref();

        if (pref?.value) return pref.value;
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
    getValuePref() {
        return this.readPref(this.preference);
    }

    getHistoryPref() {
        return this.readPref(this.historyPreference);
    }

    setValuePref() {
        const {preference, value} = this;
        if (!preference) return;

        const update = this.getValuePref();
        update.value = value;

        XH.setPref(preference, update);
    }

    setHistoryPref() {
        const {historyPreference, history} = this;
        if (!historyPreference) return;

        const update = this.getHistoryPref();
        update.history = history;

        XH.setPref(historyPreference, update);
    }

    readPref(preferenceName) {
        if (!preferenceName) return null;

        // The following migration code allows us to use previously existing values that only contained history
        const ret = cloneDeep(XH.getPref(preferenceName)),
            isDeprecatedHistoryPref = isArray(ret) && every(ret, it => isArray(it));

        return isDeprecatedHistoryPref ? {value: null, history: ret} : ret;
    }
}