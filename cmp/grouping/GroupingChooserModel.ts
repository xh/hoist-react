/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {
    HoistModel,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    SelectOption
} from '@xh/hoist/core';
import {genDisplayName} from '@xh/hoist/data';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, throwIf} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {
    compact,
    difference,
    isArray,
    isEmpty,
    isEqual,
    isObject,
    isString,
    keys,
    sortBy
} from 'lodash';

export interface GroupingChooserConfig {
    /** True to accept an empty list as a valid value. */
    allowEmpty?: boolean;

    /**
     * False (default) waits for the user to dismiss the popover before updating the
     * external/observable value.
     */
    commitOnChange?: boolean;

    /**
     * Dimensions available for selection. When using GroupingChooser to create Cube queries,
     * it is recommended to pass the `dimensions` from the related cube (or a subset thereof).
     * Note that {@link CubeField} meets the `DimensionSpec` interface.
     */
    dimensions?: (DimensionSpec | string)[];

    /**
     * Initial favorites as an array of dim name arrays, or a function to produce such an array.
     * Ignored if `persistWith.persistFavorites: false`.
     */
    initialFavorites?: string[][] | (() => string[][]);

    /** Initial value as an array of dimension names, or a function to produce such an array. */
    initialValue?: string[] | (() => string[]);

    /** Maximum number of dimensions allowed in a single grouping. */
    maxDepth?: number;

    /** Options governing persistence. */
    persistWith?: GroupingChooserPersistOptions;

    /**
     * True (default) to auto-sort dimensions by label. Set to false to show them in the order
     * provided in the `dimensions` config.
     */
    sortDimensions?: boolean;
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
    /** True (default) to include value or provide value-specific PersistOptions. */
    persistValue?: boolean | PersistOptions;

    /** True (default) to include favorites or provide favorites-specific PersistOptions. */
    persistFavorites?: boolean | PersistOptions;
}

export class GroupingChooserModel extends HoistModel {
    @observable.ref value: string[];
    @observable.ref favorites: string[][] = [];

    allowEmpty: boolean;
    commitOnChange: boolean;
    maxDepth: number;
    persistFavorites: boolean = false;
    sortDimensions: boolean;

    // Implementation fields for Control
    @observable.ref pendingValue: string[] = [];
    @observable editorIsOpen: boolean = false;
    popoverRef = createObservableRef<HTMLElement>();

    // Internal state
    @observable.ref private dimensions: Record<string, DimensionSpec>;
    @observable.ref private dimensionNames: string[];

    @computed
    get availableDims(): string[] {
        return difference(this.dimensionNames, this.pendingValue);
    }

    @computed
    get dimensionSpecs(): DimensionSpec[] {
        return Object.values(this.dimensions);
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

    @computed
    get isAddFavoriteEnabled(): boolean {
        return (
            this.persistFavorites &&
            !isEmpty(this.pendingValue) &&
            !this.isFavorite(this.pendingValue)
        );
    }

    constructor({
        allowEmpty = false,
        commitOnChange = false,
        dimensions,
        initialFavorites = [],
        initialValue = [],
        maxDepth = null,
        persistWith = null,
        sortDimensions = true
    }: GroupingChooserConfig) {
        super();
        makeObservable(this);

        this.allowEmpty = allowEmpty;
        this.commitOnChange = commitOnChange;
        this.maxDepth = maxDepth;
        this.sortDimensions = sortDimensions;

        this.setDimensions(dimensions);

        // Read and validate value and favorites
        let value = executeIfFunction(initialValue),
            favorites = executeIfFunction(initialFavorites);

        throwIf(isEmpty(value) && !this.allowEmpty, 'Initial value cannot be empty.');
        throwIf(!this.validateValue(value), 'Initial value is invalid.');

        this.setValue(value);
        this.setFavorites(favorites);

        if (persistWith) this.initPersist(persistWith);

        this.addReaction({
            track: () => this.pendingValue,
            run: () => {
                if (this.commitOnChange) this.setValue(this.pendingValue);
            }
        });
    }

    @action
    setDimensions(dimensions: Array<DimensionSpec | string>) {
        throwIf(
            isEmpty(dimensions) && !this.allowEmpty,
            'Must provide valid dimensions available for selection.'
        );

        this.dimensions = this.normalizeDimensions(dimensions);
        this.dimensionNames = keys(this.dimensions);
        this.removeUnknownDimsFromValue();
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
    }

    @action
    closeEditor() {
        this.editorIsOpen = false;
    }

    /** Transform dimension names into SelectOptions, with displayName and optional sort. */
    getDimSelectOpts(dims: string[] = this.availableDims): SelectOption[] {
        const ret = compact(dims).map(dimName => ({
            value: dimName,
            label: this.getDimDisplayName(dimName)
        }));
        return this.sortDimensions ? sortBy(ret, 'label') : ret;
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
        this.closeEditor();
    }

    validateValue(value: string[]) {
        if (!isArray(value)) return false;
        if (isEmpty(value) && !this.allowEmpty) return false;
        return value.every(dim => this.dimensionNames.includes(dim));
    }

    getValueLabel(value: string[]): string {
        return value.map(dimName => this.getDimDisplayName(dimName)).join(' › ');
    }

    getDimDisplayName(dimName: string) {
        return this.dimensions[dimName]?.displayName ?? dimName;
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

    @computed
    get hasFavorites() {
        return !isEmpty(this.favorites);
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
    addPendingAsFavorite() {
        this.addFavorite(this.pendingValue);
    }

    @action
    removeFavorite(value: string[]) {
        this.favorites = this.favorites.filter(v => !isEqual(v, value));
    }

    isFavorite(value: string[]) {
        return this.favorites?.some(v => isEqual(v, value));
    }

    //------------------------
    // Implementation
    //------------------------
    private initPersist({
        persistValue = true,
        persistFavorites = true,
        path = 'groupingChooser',
        ...rootPersistWith
    }: GroupingChooserPersistOptions) {
        if (persistValue) {
            const persistWith = isObject(persistValue)
                ? PersistenceProvider.mergePersistOptions(rootPersistWith, persistValue)
                : rootPersistWith;
            PersistenceProvider.create({
                persistOptions: {
                    path: `${path}.value`,
                    ...persistWith
                },
                target: {
                    getPersistableState: () => new PersistableState(this.value),
                    setPersistableState: ({value}) => this.setValue(value)
                },
                owner: this
            });
        }

        if (persistFavorites) {
            const persistWith = isObject(persistFavorites)
                    ? PersistenceProvider.mergePersistOptions(rootPersistWith, persistFavorites)
                    : rootPersistWith,
                provider = PersistenceProvider.create({
                    persistOptions: {
                        path: `${path}.favorites`,
                        ...persistWith
                    },
                    target: {
                        getPersistableState: () => new PersistableState(this.favorites),
                        setPersistableState: ({value}) => this.setFavorites(value)
                    },
                    owner: this
                });
            if (provider) this.persistFavorites = true;
        }
    }

    private normalizeDimensions(
        dims: Array<DimensionSpec | string>
    ): Record<string, DimensionSpec> {
        dims = dims ?? [];
        const ret = {};
        dims.forEach(it => {
            const dim = this.createDimension(it);
            ret[dim.name] = dim;
        });
        return ret;
    }

    private createDimension(src: DimensionSpec | string) {
        src = isString(src) ? {name: src} : src;
        throwIf(
            !src.hasOwnProperty('name'),
            "Dimensions provided as Objects must define a 'name' property."
        );
        return {displayName: genDisplayName(src.name), ...src};
    }

    private removeUnknownDimsFromValue() {
        const {value, dimensionNames, allowEmpty} = this,
            cleanValue = value?.filter(dim => dimensionNames.includes(dim));

        if (isEqual(value, cleanValue)) return;

        if (isEmpty(cleanValue) && !allowEmpty) {
            cleanValue.push(dimensionNames[0]);
        }

        this.setValue(cleanValue);
    }
}
