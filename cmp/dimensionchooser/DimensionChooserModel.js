/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, HoistModel, managed, PersistenceProvider} from '@xh/hoist/core';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {throwIf, apiRemoved} from '@xh/hoist/utils/js';
import {
    cloneDeep,
    compact,
    difference,
    differenceWith,
    take,
    isArray,
    isEmpty,
    isEqual,
    isString,
    keys,
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

    @observable.ref value;
    @observable.ref history;

    // Immutable properties
    maxHistoryLength = null;
    maxDepth = null;
    dimensions = null;
    dimensionVals = null;
    enableClear = false;
    @managed provider = null;

    // Internal state
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
     * @param {string[]} [c.initialValue] - initial value -- will default to first value in history,
     *      if not provided.
     * @param {string[][]} [c.initialHistory] - initial history
     * @param {DimensionChooserPersistOptions} [c.persistWith] - options governing persistence
     * @param {number} [c.maxHistoryLength] - number of recent selections to maintain in the user's
     *      history (maintained automatically by the control on a FIFO basis).
     * @param {number} [c.maxDepth] - maximum number of dimensions allowed in a single grouping.
     * @param {boolean} [c.enableClear] - Support clearing the control by removing all dimensions?
     */
    constructor({
        dimensions,
        initialValue = [],
        initialHistory = [],
        persistWith = null,
        maxHistoryLength = 5,
        maxDepth = 4,
        enableClear = false,
        ...rest
    }) {
        this.maxHistoryLength = maxHistoryLength;
        this.maxDepth = maxDepth;
        this.enableClear = enableClear;
        this.dimensions = this.normalizeDimensions(dimensions);
        this.dimensionVals = keys(this.dimensions);

        throwIf(isEmpty(this.dimensions), 'Must provide valid dimensions available for selection.');
        apiRemoved(rest.preference, 'preference', 'Use persistWith instead');
        apiRemoved(rest.historyPreference, 'historyPreference', 'Use persistWith instead');

        const persistHistory = this.persistHistory = persistWith ? (persistWith.persistHistory ?? true) : false;
        const persistValue = this.persistValue = persistWith ? (persistWith.persistValue ?? true) : false;

        // Read state from provider -- fail gently
        let state = null;
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'dimChooser', ...persistWith});
                state = cloneDeep(this.provider.read());
                if (persistHistory && state?.history) initialHistory = state.history;
                if (persistValue && state?.value) initialValue = state.value;
            } catch (e) {
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        // Initialize state to validated/clean versions of what was computed or provided above.
        this.history = initialHistory.filter(v => this.validateValue(v));
        this.value = this.validateValue(initialValue) ? initialValue : [this.dimensionVals[0]];
        this.pendingValue = this.value;

        // Attach to provider last
        if (this.provider) {
            this.addReaction({
                track: () => this.persistState,
                run: (state) => this.provider.write(state)
            });
        }
    }

    @action
    setValue(value) {
        if (!this.validateValue(value)) {
            console.warn('Attempted to set DimChooser to invalid value: ' + value);
            return;
        }
        this.value = value;
        this.addToHistory(value);
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
    validateValue(value) {
        return (
            isArray(value) &&
            (
                (isEmpty(value) && this.enableClear) ||
                (!isEmpty(value) && value.every(h => this.dimensionVals.includes(h)))
            )
        );
    }

    @action
    addToHistory(value) {
        // Remove, add to front, and truncate
        let {history, maxHistoryLength} = this;
        history = differenceWith(history, [value], isEqual);
        this.history = take([value, ...history], maxHistoryLength);
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

    //-------------------------
    // Persistence handling
    //-------------------------
    get persistState() {
        const ret = {};
        if (this.persistValue) ret.value = this.value;
        if (this.persistHistory) ret.history = this.history;
        return ret;
    }
}

/**
 * @typedef {Object} DimensionChooserPersistOptions
 * @extends PersistOptions
 * @property {boolean} [persistValue] - true to include value (default true)
 * @property {boolean} [persistHistory] - true to include history (default true)
*/