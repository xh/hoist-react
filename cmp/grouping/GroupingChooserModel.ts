/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {
    HoistModel,
    managed,
    PersistenceProvider,
    PersistOptions,
    PlainObject,
    XH
} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {
    cloneDeep,
    difference,
    isArray,
    isEmpty,
    isEqual,
    isFunction,
    isString,
    keys,
    sortBy
} from 'lodash';

export interface GroupingChooserConfig {
    /**
     * Dimensions available for selection. When using GroupingChooser to create Cube queries,
     * it is recommended to pass the `dimensions` from the related cube (or a subset thereof).
     * Note that {@link CubeField} meets the `DimensionSpec` interface.
     */
    dimensions?: (DimensionSpec | string)[];

    /** Initial value as an array of dimension names, or a function to produce such an array. */
    initialValue?: string[] | (() => string[]);

    /** Initial favorites as an array of dim name arrays, or a function to produce such an array. */
    initialFavorites?: string[][] | (() => string[][]);

    /** Options governing persistence. */
    persistWith?: GroupingChooserPersistOptions;

    /** True to accept an empty list as a valid value. */
    allowEmpty?: boolean;

    /** Maximum number of dimensions allowed in a single grouping. */
    maxDepth?: number;

    /**
     * False (default) waits for the user to dismiss the popover before updating the
     * external/observable value.
     */
    commitOnChange?: boolean;
}

/**
 * Metadata for dimensions that are available for selection via a GroupingChooser control.
 * Note that {@link CubeField} instances satisfy this interface.
 */
export interface DimensionSpec {
    /** Shortname or code (almost always a `CubeField.name`). */
    name: string;

    /** User-friendly / longer name for display. */
    displayName?: string;
}

export interface GroupingChooserPersistOptions extends PersistOptions {
    /** True (default) to save value to state. */
    persistValue?: boolean;

    /** True (default) to include favorites. */
    persistFavorites?: boolean;
}

export class GroupingChooserModel extends HoistModel {
    @observable.ref value: string[];

    @observable.ref favorites: string[][] = [];

    @observable.ref private _dimensions: Record<string, DimensionSpec>;

    dimensionNames: string[];
    allowEmpty: boolean;
    maxDepth: number;
    commitOnChange: boolean;

    @managed provider: PersistenceProvider = null;
    persistValue: boolean = false;
    persistFavorites: boolean = false;

    // Implementation fields for Control
    @observable.ref pendingValue: string[] = [];
    @observable editorIsOpen: boolean = false;
    @observable favoritesIsOpen: boolean = false;

    popoverRef = createObservableRef<HTMLElement>();

    @computed
    get availableDims(): string[] {
        return difference(this.dimensionNames, this.pendingValue);
    }

    @computed
    get dimensions() {
        return this._dimensions;
    }

    @computed
    get isValid(): boolean {
        return this.validateValue(this.pendingValue);
    }

    @computed
    get isAddEnabled(): boolean {
        const {pendingValue, maxDepth, dimensionNames, availableDims} = this,
            limit =
                maxDepth > 0 ? Math.min(maxDepth, dimensionNames.length) : dimensionNames.length,
            atMaxDepth = pendingValue.length === limit;
        return !atMaxDepth && !isEmpty(availableDims);
    }

    constructor({
        dimensions,
        initialValue = [],
        initialFavorites = [],
        persistWith = null,
        allowEmpty = false,
        maxDepth = null,
        commitOnChange = false
    }: GroupingChooserConfig) {
        super();
        makeObservable(this);

        this.setDimensions(dimensions);
        this.allowEmpty = allowEmpty;
        this.maxDepth = maxDepth;
        this.commitOnChange = commitOnChange;

        throwIf(
            isEmpty(this._dimensions),
            'Must provide valid dimensions available for selection.'
        );

        // Read and validate value and favorites
        let value = isFunction(initialValue) ? initialValue() : initialValue,
            favorites = isFunction(initialFavorites) ? initialFavorites() : initialFavorites;

        throwIf(isEmpty(value) && !this.allowEmpty, 'Initial value cannot be empty.');
        throwIf(!this.validateValue(value), 'Initial value is invalid.');

        // Read state from provider -- fail gently
        if (persistWith) {
            try {
                this.provider = PersistenceProvider.create({
                    path: 'groupingChooser',
                    ...persistWith
                });
                this.persistValue = persistWith.persistValue ?? true;
                this.persistFavorites = persistWith.persistFavorites ?? true;

                const state = cloneDeep(this.provider.read());
                if (this.persistValue && state?.value && this.validateValue(state?.value)) {
                    value = state.value;
                }
                if (this.persistFavorites && state?.favorites) {
                    favorites = state.favorites;
                }

                this.addReaction({
                    track: () => this.persistState,
                    run: state => this.provider.write(state)
                });
            } catch (e) {
                this.logError(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        this.addReaction({
            track: () => this.pendingValue,
            run: () => {
                if (this.commitOnChange) this.setValue(this.pendingValue);
            }
        });

        this.setValue(value);
        this.setFavorites(favorites);
    }

    @action
    setDimensions(dimensions: Array<DimensionSpec | string>) {
        this._dimensions = this.normalizeDimensions(dimensions);
        this.dimensionNames = keys(this._dimensions);
        this.cleanStaleDims();
    }

    @action
    setValue(value: string[]) {
        if (!this.validateValue(value)) {
            this.logWarn('Attempted to set invalid value', value);
            return;
        }
        this.value = value;
        this.pendingValue = value;
    }

    @action
    toggleEditor() {
        this.pendingValue = this.value;
        this.editorIsOpen = !this.editorIsOpen;
        this.favoritesIsOpen = false;
    }

    @action
    toggleFavoritesMenu() {
        this.favoritesIsOpen = !this.favoritesIsOpen;
        this.editorIsOpen = false;
    }

    @action
    closePopover() {
        this.editorIsOpen = false;
        this.favoritesIsOpen = false;
    }

    //-------------------------
    // Value handling
    //-------------------------
    @action
    addPendingDim(dimName: string) {
        if (!dimName) return;
        this.pendingValue = [...this.pendingValue, dimName];
    }

    @action
    replacePendingDimAtIdx(dimName: string, idx: number) {
        if (!dimName) return this.removePendingDimAtIdx(idx);
        const pendingValue = [...this.pendingValue];
        pendingValue[idx] = dimName;
        this.pendingValue = pendingValue;
    }

    @action
    removePendingDimAtIdx(idx: number) {
        const pendingValue = [...this.pendingValue];
        pendingValue.splice(idx, 1);
        this.pendingValue = pendingValue;
    }

    @action
    movePendingDimToIndex(dimName: string, toIdx: number) {
        const pendingValue = [...this.pendingValue],
            dim = pendingValue.find(it => it === dimName),
            fromIdx = pendingValue.indexOf(dim);

        pendingValue.splice(toIdx, 0, pendingValue.splice(fromIdx, 1)[0]);
        this.pendingValue = pendingValue;
    }

    @action
    commitPendingValueAndClose() {
        const {pendingValue, value} = this;
        if (!isEqual(value, pendingValue) && this.validateValue(pendingValue)) {
            this.setValue(pendingValue);
        }
        this.closePopover();
    }

    validateValue(value) {
        if (!isArray(value)) return false;
        if (isEmpty(value) && !this.allowEmpty) return false;
        return value.every(dim => this.dimensionNames.includes(dim));
    }

    normalizeDimensions(dims: Array<DimensionSpec | string>): Record<string, DimensionSpec> {
        dims = dims ?? [];
        const ret = {};
        dims.forEach(it => {
            const dim = this.createDimension(it);
            ret[dim.name] = dim;
        });
        return ret;
    }

    createDimension(src: DimensionSpec | string) {
        src = isString(src) ? {name: src} : src;
        throwIf(
            !src.hasOwnProperty('name'),
            "Dimensions provided as Objects must define a 'name' property."
        );
        return {displayName: genDisplayName(src.name), ...src};
    }

    getValueLabel(value: string[]): string {
        return (
            value.map(dimName => this.getDimDisplayName(dimName)).join(' › ') ?? value.toString()
        );
    }

    getDimDisplayName(dimName: string) {
        return this._dimensions[dimName]?.displayName ?? dimName;
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
        return sortBy(
            this.favorites.map(value => ({
                value,
                label: this.getValueLabel(value)
            })),
            it => it.label[0]
        );
    }

    @action
    setFavorites(favorites: string[][]) {
        this.favorites = favorites.filter(v => this.validateValue(v));
    }

    @action
    addFavorite(value: string[]) {
        if (isEmpty(value) || this.isFavorite(value)) return;
        this.favorites = [...this.favorites, value];
    }

    @action
    removeFavorite(value: string[]) {
        this.favorites = this.favorites.filter(v => !isEqual(v, value));
    }

    isFavorite(value: string[]) {
        return this.favorites?.some(v => isEqual(v, value));
    }

    //-------------------------
    // Persistence handling
    //-------------------------
    get persistState() {
        const ret: PlainObject = {};
        if (this.persistValue) ret.value = this.value;
        if (this.persistFavorites) ret.favorites = this.favorites;
        return ret;
    }

    //------------------------
    // Implementation
    //------------------------
    private cleanStaleDims() {
        const {value, dimensionNames, allowEmpty} = this,
            newValue = value?.filter(dim => dimensionNames.includes(dim));
        isEmpty(newValue) && !allowEmpty
            ? this.setValue([this.dimensionNames[0]])
            : this.setValue(newValue);
    }
}
