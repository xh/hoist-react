/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {HoistModel, PersistableState, PersistenceProvider, PersistOptions} from '@xh/hoist/core';
import type {GridModel} from '@xh/hoist/cmp/grid';
import {Field, genDisplayName, View} from '@xh/hoist/data';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, throwIf} from '@xh/hoist/utils/js';
import {isArray, isEmpty, isEqual, isObject, isString, keys, sortBy} from 'lodash';

export interface GroupingChooserConfig {
    /** True to accept an empty list as a valid value. */
    allowEmpty?: boolean;

    /**
     * Target ({@link GridModel} or Cube {@link View}) to which this model's grouping value
     * should be automatically applied as it changes. When bound to a GridModel, calls
     * `setGroupBy()`; when bound to a View, calls `updateQuery({dimensions: ...})`.
     *
     * This is a two-way binding — changes to the target's value are reflected back into
     * the GroupingChooserModel automatically.
     */
    bind?: GroupingBindTarget;

    /**
     * False (default) waits for the user to dismiss the popover before updating the
     * external/observable value.
     */
    commitOnChange?: boolean;

    /**
     * Dimensions available for selection. When using GroupingChooser to create Cube queries,
     * it is recommended to pass the `dimensions` from the related cube (or a subset thereof).
     * Note that {@link CubeField} meets the `DimensionSpec` interface.
     *
     * If omitted and `bind` is provided, dimensions will be auto-populated from the target:
     * fields with `isDimension: true` from a GridModel's store, or from a View's associated Cube.
     * If provided alongside `bind`, dimensions will be validated against the target's fields.
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

export interface GroupingChooserModelDefaults {
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
    /** True (default) to include value or provide value-specific PersistOptions. */
    persistValue?: boolean | PersistOptions;

    /** True (default) to include favorites or provide favorites-specific PersistOptions. */
    persistFavorites?: boolean | PersistOptions;
}

/** Target to which GroupingChooser value changes should be automatically synced. */
export type GroupingBindTarget = GridModel | View;

export class GroupingChooserModel extends HoistModel {
    /** App-level defaults for GroupingChooserModel. Instance config takes precedence. */
    static defaults: GroupingChooserModelDefaults = {
        commitOnChange: false
    };

    @observable.ref value: string[];
    @observable.ref favorites: string[][] = [];

    allowEmpty: boolean;
    bind: GroupingBindTarget;
    commitOnChange: boolean;
    maxDepth: number;
    persistFavorites: boolean = false;
    sortDimensions: boolean;

    @observable.ref dimensions: Record<string, DimensionSpec>;
    @observable.ref dimensionNames: string[];

    @computed
    get dimensionSpecs(): DimensionSpec[] {
        return Object.values(this.dimensions);
    }

    @computed
    get valueDisplayNames(): string[] {
        return this.value.map(dimName => this.getDimDisplayName(dimName));
    }

    constructor({
        allowEmpty = false,
        bind = null,
        commitOnChange = GroupingChooserModel.defaults.commitOnChange,
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
        this.bind = bind;
        this.commitOnChange = commitOnChange;
        this.maxDepth = maxDepth;
        this.sortDimensions = sortDimensions;

        // Auto-populate dimensions from bind target if not explicitly provided.
        if (!dimensions && bind) {
            dimensions = this.getDimensionsFromTarget();
        }

        this.setDimensions(dimensions);

        // Read and validate value and favorites
        let value = executeIfFunction(initialValue),
            favorites = executeIfFunction(initialFavorites);

        throwIf(isEmpty(value) && !this.allowEmpty, 'Initial value cannot be empty.');
        throwIf(!this.validateValue(value), 'Initial value is invalid.');

        this.setValue(value);
        this.setFavorites(favorites);

        if (persistWith) this.initPersist(persistWith);

        if (bind) {
            this.addReaction({
                track: () => this.value,
                run: value => this.updateTargetValue(value),
                fireImmediately: true
            });

            this.addReaction({
                track: () => this.targetValue,
                run: targetValue => {
                    if (isEqual(this.value, targetValue)) return;
                    throwIf(
                        !this.validateValue(targetValue),
                        `Bound target has grouping dimensions not present in GroupingChooserModel: [${targetValue}].`
                    );
                    this.setValue(targetValue);
                }
            });
        }
    }

    @action
    setDimensions(dimensions: Array<DimensionSpec | string>) {
        throwIf(
            isEmpty(dimensions) && !this.allowEmpty,
            'Must provide valid dimensions available for selection.'
        );

        this.dimensions = this.normalizeDimensions(dimensions);
        this.dimensionNames = keys(this.dimensions);
        if (this.bind) this.ensureDimensionsValid();
        this.removeUnknownDimsFromValue();
    }

    @action
    setValue(value: string[]) {
        if (!this.validateValue(value)) {
            this.logWarn('Attempted to set invalid value', value);
            return;
        }
        this.value = value;
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
    removeFavorite(value: string[]) {
        this.favorites = this.favorites.filter(v => !isEqual(v, value));
    }

    isFavorite(value: string[]) {
        return this.favorites?.some(v => isEqual(v, value));
    }

    //------------------------
    // Implementation
    //------------------------
    @computed.struct
    private get targetValue(): string[] {
        const {bind} = this;
        if (!bind) return null;
        if (bind instanceof View) {
            return bind.query?.dimensions?.map(d => d.name) ?? [];
        } else {
            return bind.groupBy ?? [];
        }
    }

    private updateTargetValue(value: string[]) {
        const {bind} = this;
        if (bind instanceof View) {
            bind.updateQuery({dimensions: value});
        } else {
            bind.setGroupBy(value);
        }
    }

    private get targetFields(): Field[] {
        const {bind} = this;
        return bind instanceof View ? bind.cube.fields : bind.store.fields;
    }

    private getDimensionsFromTarget(): DimensionSpec[] {
        return this.targetFields.filter(f => f.isDimension);
    }

    private ensureDimensionsValid() {
        const targetFieldNames = this.targetFields.map(f => f.name);
        throwIf(
            this.dimensionNames.some(d => !targetFieldNames.includes(d)),
            "GroupingChooserModel has dimensions not found in bound target's fields."
        );
    }

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
