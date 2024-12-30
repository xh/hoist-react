/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH, lookup} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {CompoundFilter, FilterLike, Store, withFilterByKey} from '@xh/hoist/data';
import {action, makeObservable, comparer} from '@xh/hoist/mobx';
import {stripTags, throwIf, warnIf, withDefault} from '@xh/hoist/utils/js';
import {
    debounce,
    escapeRegExp,
    filter,
    flatMap,
    get,
    intersection,
    isArray,
    isEmpty,
    isUndefined,
    without
} from 'lodash';

/**
 * @internal
 */
export class StoreFilterFieldImplModel extends HoistModel {
    override xhImpl = true;

    @lookup('*') model;

    gridModel: GridModel;
    store: Store;

    filter;
    bufferedApplyFilter;

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        let {gridModel, store, includeFields, bind, filterBuffer = 200} = this.componentProps;

        throwIf(gridModel && store, "Cannot specify both 'gridModel' and 'store' props.");
        if (!store) {
            gridModel = withDefault(gridModel, this.lookupModel(GridModel));
            store = gridModel?.store ?? null;
        }
        warnIf(
            !gridModel && !store && isEmpty(includeFields),
            "Must specify one of 'gridModel', 'store', or 'includeFields' or the filter will be a no-op."
        );
        throwIf(!store && !bind, "Must specify either 'bind' or a 'store' in StoreFilterField.");
        this.store = store;
        this.gridModel = gridModel;

        this.bufferedApplyFilter = debounce(() => this.applyFilter(), filterBuffer);

        this.addReaction({
            track: () => [this.filterText, gridModel?.columns, gridModel?.groupBy],
            run: () => this.regenerateFilter(),
            fireImmediately: true
        });

        this.addReaction({
            track: () => [this.componentProps.includeFields, this.componentProps.excludeFields],
            run: () => this.regenerateFilter(),
            equals: comparer.structural
        });
    }

    //------------------------------------------------------------------
    // Trampoline value to bindable -- from bound model, or store
    //------------------------------------------------------------------
    get filterText() {
        const {bind, model} = this.componentProps;
        return bind ? model[bind] : this.store.xhFilterText;
    }

    @action
    setFilterText(v) {
        const {bind, model} = this.componentProps;
        if (bind) {
            model.setBindable(bind, v);
        } else {
            this.store.setXhFilterText(v);
        }
    }

    //------------------------
    // Implementation
    //------------------------
    applyFilter() {
        const {store} = this;
        if (!store) return;

        const key = 'default',
            testFn = this.filter,
            filter = testFn ? {key, testFn} : null;

        // If current Store filter is an 'OR' CompoundFilter, wrap it in an 'AND'
        // CompoundFilter so this FunctionFilter gets 'ANDed' alongside it.
        let currFilter = store.filter as FilterLike;
        if (currFilter instanceof CompoundFilter && currFilter.op === 'OR') {
            currFilter = {filters: [currFilter], op: 'AND'};
        }

        const ret = withFilterByKey(currFilter, filter, key);
        store.setFilter(ret);
    }

    regenerateFilter() {
        const {filter, filterText} = this,
            {autoApply = true, onFilterChange} = this.componentProps,
            activeFields = this.getActiveFields(),
            initializing = isUndefined(filter);

        let newFilter = null;
        if (filterText && !isEmpty(activeFields)) {
            const regex = this.getRegex(filterText),
                valGetters = flatMap(activeFields, fieldPath => this.getValGetters(fieldPath));
            newFilter = rec => valGetters.some(fn => regex.test(fn(rec)));
        }

        if (filter === newFilter) return;

        this.filter = newFilter;
        if (!initializing && onFilterChange) onFilterChange(newFilter);

        if (autoApply) {
            // Only respect the buffer for non-null changes. Allows immediate initialization and quick clearing.
            if (!initializing && newFilter) {
                this.bufferedApplyFilter();
            } else {
                this.applyFilter();
            }
        }
    }

    getRegex(searchTerm) {
        searchTerm = escapeRegExp(searchTerm);
        switch (this.componentProps.matchMode ?? 'startWord') {
            case 'any':
                return new RegExp(searchTerm, 'i');
            case 'start':
                return new RegExp(`^${searchTerm}`, 'i');
            case 'startWord':
                return new RegExp(`(^|\\W)${searchTerm}`, 'i');
        }
        throw XH.exception('Unknown matchMode in StoreFilterField');
    }

    getActiveFields() {
        const {gridModel, store, componentProps} = this,
            {includeFields, excludeFields} = componentProps;

        let ret = store ? ['id', ...store.fields.map(f => f.name)] : [];
        if (includeFields) ret = store ? intersection(ret, includeFields) : includeFields;
        if (excludeFields) ret = without(ret, ...excludeFields);

        if (gridModel) {
            const groupBy = gridModel.groupBy,
                visibleCols = gridModel.getVisibleLeafColumns();

            // Push on dot-delimited grid column fields. These are supported by Grid and traverse
            // sub-objects in StoreRecord.data to display nested properties. Given that Grid treats these
            // as first-class fields and displays them w/o the need for renderers, we want to
            // include them here. (But only if their "root" is in the field list derived from the
            // Store and any given include/excludeField configs.)
            visibleCols.forEach(col => {
                const {fieldPath} = col;
                if (!isArray(fieldPath)) return;

                const rootFieldPath = fieldPath[0];
                if (ret.includes(rootFieldPath)) {
                    ret.push(col.field);
                }
            });

            // Run exclude once more to support explicitly excluding a dot-sep field added above.
            if (excludeFields) ret = without(ret, ...excludeFields);

            // Final filter for column visibility, or explicit request for inclusion.
            ret = ret.filter(f => {
                return (
                    (includeFields && includeFields.includes(f)) ||
                    visibleCols.find(c => c.field === f) ||
                    groupBy.includes(f)
                );
            });
        }

        return ret;
    }

    getValGetters(fieldName) {
        const {gridModel} = this;

        // If a GridModel has been configured, the user is looking at rendered values in a grid and
        // would reasonably expect the filter to work off what they see. Rendering can be expensive,
        // so currently supported for Date-type fields only. (Dates *require* a rendered value to
        // have any hope of matching.) This could be extended to other types if needed, perhaps
        // with a flag to manage performance tradeoffs.
        //
        // Note corresponding impl. in GridFindFieldModel - review together if updating.
        if (gridModel) {
            const {store} = gridModel,
                field = store.getField(fieldName);

            if (field?.type === 'date' || field?.type === 'localDate') {
                const cols = filter(gridModel.getVisibleLeafColumns(), {field: fieldName});

                // Empty return if no columns - even if this field has been force-included,
                // we can't match it if we can't render it.
                if (!cols) return [];

                return cols.map(column => {
                    const {renderer, getValueFn} = column;
                    return record => {
                        const ctx = {
                                record,
                                field: field.name,
                                column,
                                gridModel,
                                store,
                                agParams: null
                            },
                            ret = getValueFn(ctx);

                        return renderer ? stripTags(renderer(ret, ctx)) : ret;
                    };
                });
            }
        }

        // Otherwise just match raw.
        // Use expensive get() only when needed to support dot-separated paths.
        return fieldName.includes('.')
            ? rec => get(rec.data, fieldName)
            : rec => rec.data[fieldName];
    }
}
