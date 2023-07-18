/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
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
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {cloneDeep, isArray, isEmpty, isEqual, isFunction, isString, keys, sortBy} from 'lodash';

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

    dimensions: Record<string, DimensionSpec>;
    dimensionNames: string[];
    allowEmpty: boolean;
    maxDepth: number;
    commitOnChange: boolean;

    @managed provider: PersistenceProvider = null;
    persistValue: boolean = false;
    persistFavorites: boolean = false;

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

        this.dimensions = this.normalizeDimensions(dimensions);
        this.dimensionNames = keys(this.dimensions);
        this.allowEmpty = allowEmpty;
        this.maxDepth = maxDepth;
        this.commitOnChange = commitOnChange;

        throwIf(isEmpty(this.dimensions), 'Must provide valid dimensions available for selection.');

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
                console.error(e);
                XH.safeDestroy(this.provider);
                this.provider = null;
            }
        }

        this.setValue(value);
        this.setFavorites(favorites);
    }

    @action
    setValue(value: string[]) {
        if (!this.validateValue(value)) {
            console.warn('Attempted to set GroupingChooser to invalid value: ', value);
            return;
        }
        this.value = value;
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

    getValueLabel(value: string[]) {
        return value.map(dimName => this.getDimDisplayName(dimName)).join(' › ');
    }

    getDimDisplayName(dimName: string) {
        return this.dimensions[dimName].displayName;
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
        return this.favorites?.find(v => isEqual(v, value));
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
}
