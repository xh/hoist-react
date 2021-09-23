/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {FieldType} from '@xh/hoist/data';
import {action, bindable, observable, makeObservable} from '@xh/hoist/mobx';
import {stripTags, throwIf} from '@xh/hoist/utils/js';
import {
    escapeRegExp,
    filter,
    flatMap,
    get,
    intersection,
    isNil,
    isArray,
    isEmpty,
    isEqual,
    isFinite,
    without
} from 'lodash';

export class GridFindFieldModel extends HoistModel {

    /** @member {GridModel} */
    gridModel;
    /** @member {string} */
    matchMode;
    /** @member {number} */
    queryBuffer;
    /** @member {string[]} */
    includeFields;
    /** @member {string[]} */
    excludeFields;

    @bindable query;
    @observable.ref results;
    @observable.ref records;

    get count() {
        return this.results?.length;
    }

    get selectedIdx() {
        if (!this.count) return null;
        const matchIdx = this.results.indexOf(this.gridModel.selectedId);
        return matchIdx > -1 ? matchIdx : null;
    }

    get countLabel() {
        if (isNil(this.results)) return null;
        const {count, selectedIdx} = this,
            match = isFinite(selectedIdx) ? selectedIdx + 1 : 0;
        return `${match}/${count}`;
    }

    get hasResults() {
        return !isNil(this.results) && !isEmpty(this.results);
    }

    constructor({
        gridModel,
        matchMode = 'startWord',
        queryBuffer = 200,
        includeFields,
        excludeFields
    }) {
        super();
        makeObservable(this);

        this.gridModel = gridModel;
        this.matchMode = matchMode;
        this.queryBuffer = queryBuffer;
        this.includeFields = includeFields;
        this.excludeFields = excludeFields;

        throwIf(!gridModel, "Must specify 'gridModel' in GridFindField.");

        this.addReaction({
            track: () => [gridModel.isReady, gridModel.store.records, gridModel.columns, gridModel.sortBy, gridModel.groupBy],
            run: ([isReady]) => {
                if (!isReady) return;
                this.updateRecords();
            }
        });

        this.addReaction({
            track: () => [this.query, this.records],
            run: () => this.updateResults(),
            debounce: queryBuffer
        });
    }

    // We allow these to be dynamically updated on every render.
    updateProps({includeFields, excludeFields}) {
        if (!isEqual([includeFields, excludeFields], [this.includeFields, this.excludeFields])) {
            this.includeFields = includeFields;
            this.excludeFields = excludeFields;
            this.updateResults();
        }
    }

    selectPrev() {
        const {hasResults, results, selectedIdx, gridModel} = this;
        if (!hasResults) return;
        const endIdx = results.length - 1;
        if (!isFinite(selectedIdx)) {
            gridModel.selectAsync(results[endIdx]);
            return;
        }

        const idx = (selectedIdx - 1) % results.length;
        gridModel.selectAsync(results[idx < 0 ? endIdx : idx]);
    }

    selectNext() {
        const {hasResults, results, selectedIdx, gridModel} = this;
        if (!hasResults) return;
        if (!isFinite(selectedIdx)) {
            gridModel.selectAsync(results[0]);
            return;
        }

        const idx = (selectedIdx + 1) % results.length;
        gridModel.selectAsync(results[idx]);
    }

    //------------------------
    // Implementation
    //------------------------
    @action
    updateResults() {
        // Track ids of matching records
        const {query, records} = this,
            activeFields = this.getActiveFields();

        if (!query || isEmpty(activeFields)) {
            this.results = null;
            return;
        }

        const regex = this.getRegex(query),
            valGetters = flatMap(activeFields, (fieldPath) => this.getValGetters(fieldPath));

        this.results = records.filter(rec => {
            return valGetters.some(fn => regex.test(fn(rec)));
        }).map(rec => rec.id);
    }

    @action
    updateRecords() {
        // Track records is displayed order
        const {gridModel} = this,
            {agApi, store, sortBy, groupBy, groupSortFn} = gridModel;

        // 1) Sort records with GridModel's sortBy(s) using the Column's comparator
        const records = [...store.records];
        [...sortBy].reverse().forEach(it => {
            const column = gridModel.getColumn(it.colId);
            if (!column) return;

            const {field, getValueFn} = column,
                compFn = column.getAgSpec().comparator.bind(column),
                direction = it.sort === 'desc' ? -1 : 1;

            records.sort((a, b) => {
                const valueA = getValueFn({record: a, field, column, gridModel}),
                    valueB = getValueFn({record: b, field, column, gridModel}),
                    nodeA = agApi?.getRowNode(a.id),
                    nodeB = agApi?.getRowNode(b.id);

                return compFn(valueA, valueB, nodeA, nodeB) * direction;
            });
        });

        // 2) Sort records with GridModel's groupBy(s) using the GridModel's groupSortFn
        [...groupBy].reverse().forEach(groupField => {
            const column = gridModel.getColumn(groupField);
            if (!column) return;

            const {field, getValueFn} = column;
            records.sort((a, b) => {
                const valueA = getValueFn({record: a, field, column, gridModel}),
                    valueB = getValueFn({record: b, field, column, gridModel}),
                    nodeA = agApi?.getRowNode(a.id),
                    nodeB = agApi?.getRowNode(b.id);

                return groupSortFn(valueA, valueB, field, {gridModel, nodeA, nodeB});
            });
        });

        this.records = records;
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
        throw XH.exception('Unknown matchMode in GridFindField');
    }

    getActiveFields() {
        const {gridModel, includeFields, excludeFields} = this,
            groupBy = gridModel.groupBy,
            visibleCols = gridModel.getVisibleLeafColumns();

        let ret = ['id', ...gridModel.store.fields.map(f => f.name)];
        if (includeFields) ret = intersection(ret, includeFields);
        if (excludeFields) ret = without(ret, ...excludeFields);

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
                const cols = filter(gridModel.getVisibleLeafColumns(), {field: fieldName});

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