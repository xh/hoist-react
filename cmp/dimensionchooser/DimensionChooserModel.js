/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {action, bindable, observable} from '@xh/hoist/mobx';
import {apiRemoved, throwIf} from '@xh/hoist/utils/js';
import {
    cloneDeep,
    compact,
    difference,
    differenceWith,
    isArray,
    isEmpty,
    isEqual,
    isString,
    keys,
    sortBy,
    take,
    without
} from 'lodash';


/**
 * This model is responsible for managing the state of a `DimensionChooser` component,
 * which allows a user to a list of dimensions for any grouping based API (although typically a
 * Hoist data Cube). It produces an observable array of strings (dimension names) representing a
 * hierarchical grouping, e.g.
 *
 *      ['country', 'state', 'city']
 *      ['assetClass', 'security', 'tradeDate']
 *      ['trader'] (to represent a flat list)
 *
 * To connect this model to an application:
 *  1) Create a new instance of this model with a list of dimensions.
 *  2) Add a reaction against this model's `value` property to fetch new data when it updates.
 *  3) Render a `DimensionChooser` control in your layout to bind to this model.
 */
@HoistModel
export class DimensionChooserModel {

    /** @member {string[]} - names of dimensions selected for grouping. */
    @observable.ref value;
    /** @member {string[][]} - array of dim-name value arrays, most recently used first. */
    @observable.ref history;

    /** @member {number} */
    maxHistoryLength;
    /** @member {number} */
    maxDepth;
    /** @member {Object<string, DimensionSpec>} */
    dimensions;
    /** @member {string[]} */
    dimensionNames;
    /** @member {boolean} */
    enableClear;
    /** @member {PersistenceProvider} */
    @managed provider = null;

    /** @member {string[]} - internal state */
    @observable.ref pendingValue = [];

    //-------------------------
    // Popover rendering
    //-------------------------
    @bindable isMenuOpen = false;
    @bindable showAddSelect = false;
    @bindable activeMode = 'history'; // history vs. edit

    /**
     * @param c - DimensionChooserModel configuration.
     * @param {(DimensionSpec[]|CubeField[]|string[])} c.dimensions - dimensions available for
     *     selection. When using DimensionChooser to create Cube queries, it is recommended to pass
     *     the
     *      `dimensions` from the related cube (or a filtered subset thereof).
     * @param {string[]} [c.initialValue] - initial value as an array of dimension names.
     *      Defaults to first value in history, or first dimension in list if no history available.
     * @param {string[][]} [c.initialHistory] - initial history, an array of dim name arrays.
     * @param {DimensionChooserPersistOptions} [c.persistWith] - options governing persistence
     * @param {number} [c.maxHistoryLength] - number of recent selections to maintain in the user's
     *      history (maintained automatically by this model on a LRU basis).
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
        this.dimensionNames = keys(this.dimensions);

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
        this.value = this.validateValue(initialValue) ?
            initialValue :
            this.history.length ? this.history[0] : [this.dimensionNames[0]];
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
    addPendingDim(dimName, level) {
        // Ensure the new dimension hasn't been selected at another level.
        const newValue = without(this.pendingValue, dimName);

        // Insert the new dimension.
        newValue[level] = dimName;

        // If it's a leaf dimension, remove any subordinate dimensions.
        if (this.dimIsLeaf(dimName)) {
            newValue.splice(level + 1);
        }

        // Update intermediate internal state.
        this.pendingValue = newValue;
        this.setShowAddSelect(false);
    }

    @action
    removePendingDim(dimName) {
        this.pendingValue = without(this.pendingValue, dimName);
    }

    @action
    commitPendingValueAndClose() {
        this.setValue(this.pendingValue);
        this.closeMenu();
    }

    // True if a leaf-level dim has been specified via the editor - any further child groupings
    // would be derivative at this point and should not be allowed by the UI.
    get leafInPending() {
        return this.pendingValue.some(dimName => this.dimIsLeaf(dimName));
    }

    // Returns dimensions available for choosing via a Select input at each level of the add menu,
    // formatted for direct use by the Select as options (i.e. as `{value, label}` objects).
    // Pass current value as second arg to ensure included - used when editing a level (vs. adding).
    dimOptionsForLevel(level, currDimVal = null) {
        // Dimensions which do not appear in the add menu
        const remainingDims = difference(this.dimensionNames, this.pendingValue);

        // Dimensions subordinate to this one in the tree hierarchy
        const childDims = this.pendingValue.slice(level + 1) || [];

        const ret = compact([
            ...remainingDims, ...childDims, currDimVal
        ]).map(dimName => {
            const dim = this.dimensions[dimName];
            return {value: dimName, label: dim.displayName};
        });

        return sortBy(ret, 'label');
    }

    getDimDisplayName(dimName) {
        return this.dimensions[dimName].displayName;
    }

    //-------------------------
    // Implementation
    //-------------------------
    validateValue(value) {
        return (
            isArray(value) &&
            (
                (isEmpty(value) && this.enableClear) ||
                (!isEmpty(value) && value.every(h => this.dimensionNames.includes(h)))
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
            ret[dim.name] = dim;
        });

        return ret;
    }

    // TODO - discuss if we wish to make this backwards compat with <= v35, where dimSpec supported
    //      value, label, and leaf configs instead of name, displayName, and isLeafDimension.
    createDimension(src) {
        src = isString(src) ? {name: src} : src;

        throwIf(
            !src.hasOwnProperty('name'),
            "Dimensions provided as Objects must define a 'name' property."
        );

        return {
            displayName: genDisplayName(src.name),
            isLeafDimension: false,
            ...src
        };
    }

    dimIsLeaf(dimName) {
        return this.dimensions[dimName].isLeafDimension;
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
 * @typedef {Object} DimensionSpec - metadata for dimensions that are available for selection via
 *      a DimensionChooser control. Note that {@see CubeField} instances satisfy this interface.
 * @property {string} name - shortname or code (almost always a `CubeField.name`).
 * @property {string} displayName - user-friendly / longer name for display.
 * @property {boolean} isLeafDimension - true to indicate that the dimension does not support any
 *      further sub-groupings.
 */

/**
 * @typedef {Object} DimensionChooserPersistOptions
 * @extends PersistOptions
 * @property {boolean} [persistValue] - true to include value (default true)
 * @property {boolean} [persistHistory] - true to include history (default true)
*/