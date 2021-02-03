/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {action, makeObservable} from '@xh/hoist/mobx';
import {stripTags, throwIf, warnIf} from '@xh/hoist/utils/js';
import {
    debounce,
    escapeRegExp,
    filter,
    flatMap,
    get,
    intersection,
    isArray,
    isEmpty,
    isEqual,
    isUndefined,
    without
} from 'lodash';

export class StoreFilterFieldImplModel extends HoistModel {

    model;
    bind;

    /** @type {GridModel} */
    gridModel;
    /** @type {Store} */
    store;

    filterBuffer;
    onFilterChange;
    includeFields;
    excludeFields;

    filter;
    bufferedApplyFilter;

    constructor({
        model,
        bind,
        gridModel,
        store,
        filterBuffer = 200,
        onFilterChange,
        includeFields,
        excludeFields,
        matchMode = 'startWord'
    }) {
        super();
        makeObservable(this);
        this.model = model;
        this.bind = bind;
        this.gridModel = gridModel;
        this.store = store;
        this.filterBuffer = filterBuffer;
        this.onFilterChange = onFilterChange;
        this.includeFields = includeFields;
        this.excludeFields = excludeFields;
        this.matchMode = matchMode;

        warnIf(!gridModel && !store && isEmpty(includeFields),
            "Must specify one of 'gridModel', 'store', or 'includeFields' or the filter will be a no-op."
        );
        throwIf(!store && !bind, "Must specify either 'bind' or a 'store' in StoreFilterField.");

        this.bufferedApplyFilter = debounce(() => this.applyFilter(), filterBuffer);

        this.addReaction({
            track: () => [this.filterText, gridModel?.columns, gridModel?.groupBy],
            run: () => this.regenerateFilter(),
            fireImmediately: true
        });
    }

    // We allow these to be dynamic by updating on every render.
    updateFilterProps({
        onFilterChange,
        includeFields,
        excludeFields
    }) {
        // just record change to callback
        this.onFilterChange = onFilterChange;

        // ...other changes require re-generation
        if (!isEqual([includeFields, excludeFields], [this.includeFields, this.excludeFields])) {
            this.includeFields = includeFields;
            this.excludeFields = excludeFields;
            this.regenerateFilter();
        }
    }

    //------------------------------------------------------------------
    // Trampoline value to bindable -- from bound model, or store
    //------------------------------------------------------------------
    get filterText() {
        const {bind, model, store} = this;
        return bind ? model[bind] : store.xhFilterText;
    }

    @action
    setFilterText(v) {
        const {bind, model, store} = this;
        if (bind) {
            model.setBindable(bind, v);
        } else {
            store.setXhFilterText(v);
        }
    }

    //------------------------
    // Implementation
    //------------------------
    applyFilter() {
        this.store?.setFilter(this.filter);
    }

    regenerateFilter() {
        const {filter, filterText} = this,
            activeFields = this.getActiveFields(),
            initializing = isUndefined(filter);

        let newFilter = null;
        if (filterText && !isEmpty(activeFields)) {
            const regex = this.getRegex(filterText),
                valGetters = flatMap(activeFields, (fieldPath) => this.getValGetters(fieldPath));
            newFilter = (rec) => valGetters.some(fn => (
                regex.test(fn(rec))
            ));
        }

        if (filter === newFilter) return;

        this.filter = newFilter;
        if (!initializing && this.onFilterChange) this.onFilterChange(newFilter);

        // Only respect the buffer for non-null changes. Allows immediate initialization and quick clearing.
        if (!initializing && newFilter) {
            this.bufferedApplyFilter();
        } else {
            this.applyFilter();
        }
    }

    getRegex(searchTerm) {
        searchTerm = escapeRegExp(searchTerm);
        switch (this.matchMode) {
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
        let {gridModel, includeFields, excludeFields, store} = this;

        let ret = store ? ['id', ...store.fields.map(f => f.name)] : [];
        if (includeFields) ret = store ? intersection(ret, includeFields) : includeFields;
        if (excludeFields) ret = without(ret, ...excludeFields);

        if (gridModel) {
            const groupBy = gridModel.groupBy,
                visibleCols = gridModel.getVisibleLeafColumns();

            // Push on dot-delimited grid column fields. These are supported by Grid and traverse
            // sub-objects in Record.data to display nested properties. Given that Grid treats these
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
        const {gridModel} = this,
            {DATE, LOCAL_DATE} = FieldType;

        // If a GridModel has been configured, the user is looking at rendered values in a grid and
        // would reasonably expect the filter to work off what they see. Rendering can be expensive,
        // so currently supported for Date-type fields only. (Dates *require* a rendered value to
        // have any hope of matching.) This could be extended to other types if needed, perhaps
        // with a flag to manage performance tradeoffs.
        if (gridModel) {
            const {store} = gridModel,
                field = store.getField(fieldName);

            if (field?.type === DATE || field?.type === LOCAL_DATE) {
                const cols = filter(gridModel.getLeafColumns(), {field: fieldName});

                // Empty return if no columns - even if this field has been force-included,
                // we can't match it if we can't render it.
                if (!cols) return [];

                return cols.map(column => {
                    const {renderer, getValueFn} = column;
                    return (record) => {
                        const ctx = {record, field, column, gridModel, store},
                            ret = getValueFn(ctx);

                        return renderer ? stripTags(renderer(ret, ctx)) : ret;
                    };
                });
            }
        }

        // Otherwise just match raw.
        // Use expensive get() only when needed to support dot-separated paths.
        return fieldName.includes('.') ? (rec) => get(rec.data, fieldName) : (rec) => rec.data[fieldName];
    }
}
