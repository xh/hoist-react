/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {
    HoistModel,
    managed,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    Thunkable
} from '@xh/hoist/core';
import {
    appendFilter,
    Filter,
    FilterBindTarget,
    FilterValueSource,
    isFilterValueSource,
    parseFilter
} from '@xh/hoist/data';
import {FilterLike} from '@xh/hoist/data/filter/Types';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {executeIfFunction, throwIf} from '@xh/hoist/utils/js';
import {isObject, isString} from 'lodash';

import {FilterBuilderFieldSpec, FilterBuilderFieldSpecConfig} from './FilterBuilderFieldSpec';
import {FilterGroupNode} from './impl/FilterGroupNode';

export interface FilterBuilderConfig {
    /**
     * Specifies the fields this model supports for filtering.
     * If a `valueSource` is provided, these may be specified as field names in that source
     * or omitted entirely, indicating that all fields should be filter-enabled.
     */
    fieldSpecs?: Array<FilterBuilderFieldSpecConfig | string>;

    /** Default properties to be assigned to all FilterBuilderFieldSpecs created by this model. */
    fieldSpecDefaults?: Partial<FilterBuilderFieldSpecConfig>;

    /**
     * Target (typically a {@link Store} or Cube {@link View}) to which this model's filter should
     * be automatically applied as it changes.
     *
     * Note this binding is bi-directional - the target's filter will also be *set onto* this model
     * if it changes on the target, to support sync'd filtering between a FilterBuilder and
     * other filter components bound to the same target.
     */
    bind?: FilterBindTarget;

    /**
     * Source (typically a {@link Store} or Cube {@link View}) from which this model can lookup
     * matching Field-level defaults for `fieldSpecs` and provide value suggestions.
     * Defaults to {@link bind} if bind is a valid source.
     */
    valueSource?: FilterValueSource;

    /**
     * Initial filter value, or a function to produce one.
     */
    initialValue?: Thunkable<FilterLike>;

    /**
     * Initial favorites as an array of filter configs, or a function to produce such an array.
     */
    initialFavorites?: Thunkable<FilterLike[]>;

    /**
     * True to immediately commit changes to the bound target on every edit.
     * When false (default), changes accumulate and require an explicit `apply()` call.
     */
    commitOnChange?: boolean;

    /** Maximum depth of nested groups. Default 3. */
    maxGroupDepth?: number;

    /** Options governing persistence. */
    persistWith?: FilterBuilderPersistOptions;
}

export class FilterBuilderModel extends HoistModel {
    bind: FilterBindTarget;
    valueSource: FilterValueSource;
    maxGroupDepth: number;
    persistFavorites: boolean = false;

    @managed fieldSpecs: FilterBuilderFieldSpec[] = [];
    @observable.ref rootGroup: FilterGroupNode;
    @bindable commitOnChange: boolean;
    @observable.ref favorites: Filter[] = [];

    // Track the last committed value for dirty-checking and cancel/revert
    @observable.ref private committedValue: Filter = null;

    // Flag to suppress outbound sync during inbound updates
    private _suppressSync = false;

    @computed
    get value(): Filter {
        return this.rootGroup?.toFilter() ?? null;
    }

    @computed
    get isDirty(): boolean {
        const {value, committedValue} = this;
        if (value == null && committedValue == null) return false;
        if (value == null || committedValue == null) return true;
        return !value.equals(committedValue);
    }

    @computed
    get isEmpty(): boolean {
        return this.rootGroup?.isEmpty ?? true;
    }

    constructor({
        fieldSpecs,
        fieldSpecDefaults,
        bind = null,
        valueSource,
        initialValue = null,
        initialFavorites = [],
        commitOnChange = false,
        maxGroupDepth = 3,
        persistWith
    }: FilterBuilderConfig = {}) {
        super();
        makeObservable(this);

        this.bind = bind;
        this.commitOnChange = commitOnChange;
        this.maxGroupDepth = maxGroupDepth;

        this.valueSource = valueSource;
        if (!this.valueSource && isFilterValueSource(bind)) {
            this.valueSource = bind;
        }

        this.fieldSpecs = this.parseFieldSpecs(fieldSpecs, fieldSpecDefaults);

        // Initialize working tree from initial value
        const initFilter = parseFilter(executeIfFunction(initialValue));
        this.rootGroup = FilterGroupNode.fromFilter(initFilter);
        this.committedValue = initFilter;

        // Initialize favorites
        this.setFavorites(executeIfFunction(initialFavorites) ?? []);

        // Persistence
        if (persistWith) this.initPersist(persistWith);

        // Initial outbound sync
        if (bind && initFilter) this.syncToTarget();

        // Inbound sync: track changes on the bind target
        if (bind) {
            this.addReaction({
                track: () => bind.filter,
                run: filter => this.handleInboundFilterChange(filter)
            });
        }

        // commitOnChange auto-apply
        this.addReaction({
            track: () => this.value,
            run: () => {
                if (this.commitOnChange && !this._suppressSync) {
                    this.apply();
                }
            }
        });
    }

    //--------------------
    // Actions
    //--------------------
    @action
    addRule(parentGroup?: FilterGroupNode) {
        const group = parentGroup ?? this.rootGroup;
        return group.addRule();
    }

    @action
    addGroup(parentGroup?: FilterGroupNode) {
        const group = parentGroup ?? this.rootGroup;
        return group.addGroup();
    }

    @action
    removeNode(node: any, parentGroup?: FilterGroupNode) {
        const parent = parentGroup ?? this.findParent(node);
        parent?.removeChild(node);
    }

    @action
    moveNode(node: any, direction: 'up' | 'down', parentGroup?: FilterGroupNode) {
        const parent = parentGroup ?? this.findParent(node);
        parent?.moveChild(node, direction);
    }

    @action
    setGroupOp(group: FilterGroupNode, op: 'AND' | 'OR') {
        group.setOp(op);
    }

    @action
    setGroupNot(group: FilterGroupNode, not: boolean) {
        group.setNot(not);
    }

    /** Commit the current working tree value to the bound target. */
    @action
    apply() {
        this.committedValue = this.value;
        this.syncToTarget();
    }

    /** Revert the working tree to the last committed state. */
    @action
    cancel() {
        this._suppressSync = true;
        this.rootGroup.destroy();
        this.rootGroup = FilterGroupNode.fromFilter(this.committedValue);
        this._suppressSync = false;
    }

    /** Clear the working tree entirely. */
    @action
    clear() {
        this.rootGroup.destroy();
        this.rootGroup = new FilterGroupNode();
        if (this.commitOnChange) this.apply();
    }

    /** Alias for cancel. */
    reset() {
        this.cancel();
    }

    //--------------------
    // Favorites
    //--------------------
    get favoritesOptions() {
        return this.favorites.map(value => ({value}));
    }

    @action
    setFavorites(favorites: FilterLike[]) {
        this.favorites = favorites.map(parseFilter).filter(f => f != null);
    }

    @action
    addFavorite(filter?: Filter) {
        const toAdd = filter ?? this.value;
        if (!toAdd || this.isFavorite(toAdd)) return;
        this.favorites = [...this.favorites, toAdd];
    }

    @action
    removeFavorite(filter: Filter) {
        this.favorites = this.favorites.filter(f => !f.equals(filter));
    }

    isFavorite(filter: Filter): boolean {
        return !!this.favorites?.find(f => f.equals(filter));
    }

    /** Load a favorite into the working tree. */
    @action
    loadFavorite(filter: Filter) {
        this._suppressSync = true;
        this.rootGroup.destroy();
        this.rootGroup = FilterGroupNode.fromFilter(filter);
        this._suppressSync = false;
        if (this.commitOnChange) this.apply();
    }

    //--------------------
    // Field Spec Access
    //--------------------
    getFieldSpec(fieldName: string): FilterBuilderFieldSpec {
        return this.fieldSpecs.find(it => it.field === fieldName);
    }

    /** Get the depth of a group within the working tree (root = 0). */
    getGroupDepth(group: FilterGroupNode): number {
        return this.findDepth(group, this.rootGroup, 0);
    }

    //----------------------------
    // Implementation
    //----------------------------
    private parseFieldSpecs(
        specs: Array<FilterBuilderFieldSpecConfig | string>,
        fieldSpecDefaults: Partial<FilterBuilderFieldSpecConfig>
    ): FilterBuilderFieldSpec[] {
        const {valueSource} = this;

        throwIf(
            !valueSource && (!specs || specs.some(isString)),
            'Must provide a valueSource if fieldSpecs are not provided, or provided as strings.'
        );

        if (!specs) specs = valueSource.fieldNames;

        return specs.map(spec => {
            if (isString(spec)) spec = {field: spec};
            return new FilterBuilderFieldSpec({
                source: valueSource,
                ...fieldSpecDefaults,
                ...spec
            });
        });
    }

    @action
    private handleInboundFilterChange(filter: Filter) {
        if (this._suppressSync) return;

        // Strip FunctionFilters — unsupported by FilterBuilder
        const cleaned = filter?.removeFunctionFilters() ?? null;

        // If we have uncommitted edits, don't overwrite — log a warning
        if (this.isDirty) {
            this.logWarn(
                'Bound target filter changed while FilterBuilder has uncommitted edits.',
                'Preserving working tree.'
            );
            return;
        }

        this._suppressSync = true;
        this.rootGroup.destroy();
        this.rootGroup = FilterGroupNode.fromFilter(cleaned);
        this.committedValue = cleaned;
        this._suppressSync = false;
    }

    private syncToTarget() {
        const {bind, value} = this;
        if (!bind) return;

        this._suppressSync = true;
        try {
            const filter = appendFilter(bind.filter?.removeFieldFilters(), value);
            bind.setFilter(filter);
        } finally {
            this._suppressSync = false;
        }
    }

    private findParent(node: any, group: FilterGroupNode = this.rootGroup): FilterGroupNode {
        if (group.children.includes(node)) return group;
        for (const child of group.children) {
            if (child instanceof FilterGroupNode) {
                const found = this.findParent(node, child);
                if (found) return found;
            }
        }
        return null;
    }

    private findDepth(target: FilterGroupNode, current: FilterGroupNode, depth: number): number {
        if (current === target) return depth;
        for (const child of current.children) {
            if (child instanceof FilterGroupNode) {
                const found = this.findDepth(target, child, depth + 1);
                if (found >= 0) return found;
            }
        }
        return -1;
    }

    private initPersist({
        persistValue = true,
        persistFavorites = true,
        path = 'filterBuilder',
        ...rootPersistWith
    }: FilterBuilderPersistOptions) {
        if (persistValue) {
            const status = {initialized: false},
                persistWith = isObject(persistValue)
                    ? PersistenceProvider.mergePersistOptions(rootPersistWith, persistValue)
                    : rootPersistWith;
            PersistenceProvider.create({
                persistOptions: {
                    path: `${path}.value`,
                    ...persistWith
                },
                target: {
                    getPersistableState: () => new PersistableState(this.value?.toJSON() ?? null),
                    setPersistableState: ({value}) => {
                        if (!status.initialized) {
                            const filter = parseFilter(value);
                            this.rootGroup = FilterGroupNode.fromFilter(filter);
                            this.committedValue = filter;
                        }
                    }
                },
                owner: this
            });
            status.initialized = true;
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
                        getPersistableState: () =>
                            new PersistableState(this.favorites.map(f => f.toJSON())),
                        setPersistableState: ({value}) => this.setFavorites(value)
                    },
                    owner: this
                });
            if (provider) this.persistFavorites = true;
        }
    }

    override destroy() {
        this.rootGroup?.destroy();
        super.destroy();
    }
}

interface FilterBuilderPersistOptions extends PersistOptions {
    /** True (default) to include value or provide value-specific PersistOptions. */
    persistValue?: boolean | PersistOptions;
    /** True (default) to include favorites or provide favorites-specific PersistOptions. */
    persistFavorites?: boolean | PersistOptions;
}
