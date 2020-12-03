/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {HoistModel, managed, PersistenceProvider, XH} from '@xh/hoist/core';
import {action, computed, observable} from '@xh/hoist/mobx';
import {genDisplayName} from '@xh/hoist/data';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {cloneDeep, difference, isArray, isEmpty, isEqual, isString, keys, sortBy} from 'lodash';

@HoistModel
export class GroupingChooserModel {

    /** @member {string[]} - names of dimensions selected for grouping. */
    @observable.ref value;
    /** @member {string[][]} - array of dim-name value arrays */
    @observable.ref favorites = [];

    /** @member {number} */
    maxDepth;
    /** @member {Object<string, DimensionSpec>} */
    dimensions;
    /** @member {string[]} */
    dimensionNames;
    /** @member {PersistenceProvider} */
    @managed provider = null;
    persistValue = false;
    persistFavorites = false;

    // Implementation fields for Control
    @observable.ref pendingValue = [];
    @observable editorIsOpen = false;
    @observable favoritesIsOpen = false;
    @observable showAddControl = false;

    popoverRef = createObservableRef();

    @computed
    get availableDims() {
        return difference(this.dimensionNames, this.pendingValue);
    }

    @computed
    get atMaxDepth() {
        const {pendingValue, maxDepth, dimensionNames} = this,
            limit = maxDepth > 0 ? Math.min(maxDepth, dimensionNames.length) : dimensionNames.length;
        return pendingValue.length === limit;
    }

    @computed
    get isValid() {
        return this.validateValue(this.pendingValue);
    }

    @computed
    get addDisabledMsg() {
        if (isEmpty(this.availableDims)) return 'All dimensions added';
        if (this.atMaxDepth) return 'Further grouping not available';
        return null;
    }

    /**
     * @param c - GroupingChooserModel configuration.
     * @param {(DimensionSpec[]|CubeField[]|string[])} c.dimensions - dimensions available for
     *     selection. When using GroupingChooser to create Cube queries, it is recommended to pass
     *     the `dimensions` from the related cube (or a filtered subset thereof).
     * @param {string[]} [c.initialValue] - initial value as an array of dimension names.
     * @param {string[][]} [c.initialFavorites] - initial favorites, an array of dim name arrays.
     * @param {?GroupingChooserPersistOptions} [c.persistWith] - options governing persistence.
     * @param {?number} [c.maxDepth] - maximum number of dimensions allowed in a single grouping.
     */
    constructor({
        dimensions,
        initialValue = [],
        initialFavorites = [],
        persistWith = null,
        maxDepth = null
    }) {
        this.dimensions = this.normalizeDimensions(dimensions);
        this.dimensionNames = keys(this.dimensions);
        this.maxDepth = maxDepth;

        throwIf(isEmpty(this.dimensions), 'Must provide valid dimensions available for selection.');

        // Read state from provider -- fail gently
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({path: 'groupingChooser', ...persistWith});
                this.persistValue = persistWith.persistValue ?? true;
                this.persistFavorites = persistWith.persistFavorites ?? true;

                const state = cloneDeep(this.provider.read());
                if (this.persistValue && state?.value) initialValue = state.value;
                if (this.persistFavorites && state?.favorites) initialFavorites = state.favorites;

                this.addReaction({
                    track: () => this.persistState,
                    run: (state) => this.provider.write(state)
                });
            } catch (e) {
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        this.setValue(initialValue);
        this.setFavorites(initialFavorites);
    }

    @action
    setValue(value) {
        if (!this.validateValue(value)) {
            console.warn('Attempted to set GroupingChooser to invalid value: ' + value);
            return;
        }
        this.value = value;
        this.pendingValue = value;
    }

    @action
    showEditor() {
        this.pendingValue = this.value;
        this.editorIsOpen = true;
        this.favoritesIsOpen = false;
    }

    @action
    openFavoritesMenu() {
        this.favoritesIsOpen = true;
        this.editorIsOpen = false;
    }

    @action
    closePopover() {
        this.editorIsOpen = false;
        this.favoritesIsOpen = false;
        this.showAddControl = false;
    }

    @action
    toggleAddControl() {
        this.showAddControl = !this.showAddControl;
    }

    //-------------------------
    // Value handling
    //-------------------------
    @action
    addPendingDim(dimName) {
        if (!dimName) return;
        this.pendingValue = [...this.pendingValue, dimName];
        this.showAddControl = false;
    }

    @action
    replacePendingDimAtIdx(dimName, idx) {
        const pendingValue = [...this.pendingValue];
        pendingValue[idx] = dimName;
        this.pendingValue = pendingValue;
    }

    @action
    removePendingDimAtIdx(idx) {
        const pendingValue = [...this.pendingValue];
        pendingValue.splice(idx, 1);
        this.pendingValue = pendingValue;

        if (isEmpty(this.pendingValue)) {
            this.showAddControl = true;
        }
    }

    @action
    movePendingDimToIndex(dimName, toIdx) {
        const pendingValue = [...this.pendingValue],
            dim = pendingValue.find(it => it === dimName),
            fromIdx = pendingValue.indexOf(dim);

        pendingValue.splice(toIdx, 0, pendingValue.splice(fromIdx, 1)[0]);
        this.pendingValue = pendingValue;
    }

    @action
    commitPendingValueAndClose() {
        if (!isEqual(this.value, this.pendingValue)) {
            this.setValue(this.pendingValue);
        }
        this.closePopover();
    }

    validateValue(value) {
        return (
            isArray(value) &&
            !isEmpty(value) &&
            value.every(h => this.dimensionNames.includes(h))
        );
    }

    normalizeDimensions(dims) {
        dims = dims || [];
        const ret = {};
        dims.forEach(it => {
            const dim = this.createDimension(it);
            ret[dim.name] = dim;
        });
        return ret;
    }

    createDimension(src) {
        src = isString(src) ? {name: src} : src;
        throwIf(!src.hasOwnProperty('name'), "Dimensions provided as Objects must define a 'name' property.");
        return {displayName: genDisplayName(src.name), ...src};
    }

    getValueLabel(value) {
        return value.map(dimName => this.getDimDisplayName(dimName)).join(' › ');
    }

    getDimDisplayName(dimName) {
        return this.dimensions[dimName].displayName;
    }

    //--------------------
    // Drag Drop
    //--------------------
    onDragEnd(result) {
        const {draggableId, destination} = result;
        if (!destination) return;
        this.movePendingDimToIndex(draggableId, destination.index);
    }

    //--------------------
    // Favorites
    //--------------------
    get favoritesOptions() {
        return sortBy(this.favorites.map(value => ({
            value,
            label: this.getValueLabel(value)
        })), it => it.label[0]);
    }

    @action
    setFavorites(favorites) {
        this.favorites = favorites.filter(v => this.validateValue(v));
    }

    @action
    addFavorite(value) {
        if (isEmpty(value) || this.isFavorite(value)) return;
        this.favorites = [...this.favorites, value];
    }

    @action
    removeFavorite(value) {
        this.favorites = this.favorites.filter(v => !isEqual(v, value));
    }

    isFavorite(value) {
        return this.favorites?.find(v => isEqual(v, value));
    }

    //-------------------------
    // Persistence handling
    //-------------------------
    get persistState() {
        const ret = {};
        if (this.persistValue) ret.value = this.value;
        if (this.persistFavorites) ret.favorites = this.favorites;
        return ret;
    }

}

/**
 * @typedef {Object} DimensionSpec - metadata for dimensions that are available for selection via
 *      a GroupingChooser control. Note that {@see CubeField} instances satisfy this interface.
 * @property {string} name - shortname or code (almost always a `CubeField.name`).
 * @property {string} displayName - user-friendly / longer name for display.
 */

/**
 * @typedef {Object} GroupingChooserPersistOptions
 * @extends PersistOptions
 * @property {boolean} [persistValue] - true (default) to save value to state.
 * @property {boolean} [persistFavorites] - true (default) to include favorites.
 */
