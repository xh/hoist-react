/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, useContextModel, useLocalModel, XH} from '@xh/hoist/core';
import {GridFindField} from '@xh/hoist/desktop/cmp/grid';
import {TextInputModel} from '@xh/hoist/desktop/cmp/input';
import {action, bindable, comparer, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {errorIf, logError, stripTags, throwIf, withDefault} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {
    escapeRegExp,
    filter,
    flatMap,
    get,
    intersection,
    isArray,
    isEmpty,
    isFinite,
    isNil,
    without
} from 'lodash';

/**
 * @internal
 */
export class GridFindFieldImplModel extends HoistModel {
    override xhImpl = true;

    @bindable
    query: string = null;

    get matchMode(): string {
        return this.componentProps.matchMode ?? 'startWord';
    }
    get queryBuffer(): number {
        return this.componentProps.queryBuffer ?? 200;
    }
    get includeFields(): string[] {
        return this.componentProps.includeFields;
    }
    get excludeFields(): string[] {
        return this.componentProps.excludeFields;
    }

    @observable.ref results;
    inputRef = createObservableRef<TextInputModel>();
    _records = null;

    get count(): number {
        return this.results?.length;
    }

    get selectedIdx(): number {
        if (!this.count) return null;
        const matchIdx = this.results.indexOf(this.gridModel.selectedId);
        return matchIdx > -1 ? matchIdx : null;
    }

    get countLabel(): string {
        if (isNil(this.results)) return null;
        const {count, selectedIdx} = this,
            match = isFinite(selectedIdx) ? selectedIdx + 1 : 0;
        return `${match}/${count}`;
    }

    get hasFocus() {
        return this.inputRef?.current?.hasFocus;
    }

    @computed
    get hasQuery(): boolean {
        return !isNil(this.query) && this.query.length > 0;
    }

    @computed
    get hasResults(): boolean {
        return !isNil(this.results) && !isEmpty(this.results);
    }

    @computed
    get gridModel() {
        const ret = withDefault(this.componentProps.gridModel, this.lookupModel(GridModel));
        if (!ret) {
            this.logError("No GridModel available.  Provide via a 'gridModel' prop, or context.");
        } else if (!ret.selModel?.isEnabled) {
            this.logError('GridFindField must be bound to GridModel with selection enabled.');
        }
        return ret;
    }

    //------------------------------------------------------------------
    // Trampoline value to grid
    //------------------------------------------------------------------
    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.addReaction({
            track: () => this.query,
            run: () => this.updateResults(true),
            debounce: this.queryBuffer
        });

        this.addReaction({
            track: () => [
                this.gridModel?.store.records,
                this.gridModel?.columns,
                this.gridModel?.sortBy,
                this.gridModel?.groupBy
            ],
            run: () => {
                this._records = null;
                if (this.hasQuery) this.updateResults();
            }
        });

        this.addReaction({
            track: () => [this.includeFields, this.excludeFields],
            run: () => this.updateResults(),
            equals: comparer.structural
        });
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
    private updateResults(autoSelect = false) {
        // Track ids of matching records
        const {query, gridModel} = this,
            activeFields = this.getActiveFields();

        if (!query || isEmpty(activeFields)) {
            this.results = null;
            return;
        }

        const regex = this.getRegex(query),
            valGetters = flatMap(activeFields, fieldPath => this.getValGetters(fieldPath));

        this.results = this.getRecords()
            .filter(rec => {
                return valGetters.some(fn => regex.test(fn(rec)));
            })
            .map(rec => rec.id);

        // Auto-select first matching result
        if (autoSelect && this.hasResults && !isFinite(this.selectedIdx)) {
            gridModel?.selectAsync(this.results[0]);
        }
    }

    private getRecords() {
        if (!this._records) {
            const records = this.sortRecordsRecursive([...this.gridModel.store.rootRecords]);
            this._records = this.sortRecordsByGroupBy(records);
        }
        return this._records;
    }

    // Sort records with GridModel's sortBy(s) using the Column's comparator
    private sortRecordsRecursive(records) {
        const {gridModel} = this,
            {sortBy, treeMode, agApi, store} = gridModel,
            ret = [];

        [...sortBy].reverse().forEach(it => {
            const column = gridModel.getColumn(it.colId);
            if (!column) return;

            const {field, getValueFn} = column,
                compFn = column.getAgSpec().comparator.bind(column),
                direction = it.sort === 'desc' ? -1 : 1;

            const ctx = {field, column, gridModel, store, agParams: null};
            records.sort((a, b) => {
                const valueA = getValueFn({record: a, ...ctx}),
                    valueB = getValueFn({record: b, ...ctx}),
                    nodeA = agApi?.getRowNode(a.agId),
                    nodeB = agApi?.getRowNode(b.agId);

                return compFn(valueA, valueB, nodeA, nodeB) * direction;
            });
        });

        records.forEach(rec => {
            ret.push(rec);
            if (treeMode && !isEmpty(rec.children)) {
                const children = this.sortRecordsRecursive(rec.children);
                ret.push(...children);
            }
        });

        return ret;
    }

    // Sort records with GridModel's groupBy(s) using the GridModel's groupSortFn
    private sortRecordsByGroupBy(records) {
        const {gridModel} = this,
            {agApi, groupBy, groupSortFn, store} = gridModel;

        [...groupBy].reverse().forEach(groupField => {
            const column = gridModel.getColumn(groupField);
            if (!column) return;

            const {field, getValueFn} = column,
                ctx = {field, column, gridModel, store, agParams: null};

            records.sort((a, b) => {
                const valueA = getValueFn({record: a, ...ctx}),
                    valueB = getValueFn({record: b, ...ctx}),
                    nodeA = agApi?.getRowNode(a.agId),
                    nodeB = agApi?.getRowNode(b.agId);

                return groupSortFn(valueA, valueB, field, {gridModel, nodeA, nodeB});
            });
        });

        return records;
    }

    private getRegex(searchTerm) {
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

    private getActiveFields() {
        const {gridModel, includeFields, excludeFields} = this,
            groupBy = gridModel.groupBy,
            visibleCols = gridModel.getVisibleLeafColumns();

        let ret = ['id', ...gridModel.store.fields.map(f => f.name)];
        if (includeFields) ret = intersection(ret, includeFields);
        if (excludeFields) ret = without(ret, ...excludeFields);

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

        return ret;
    }

    private getValGetters(fieldName) {
        const {gridModel} = this,
            {store} = gridModel,
            field = store.getField(fieldName);

        // See corresponding method in StoreFilterFieldImplModel for notes on this implementation.
        if (field?.type === 'date' || field?.type === 'localDate') {
            const cols = filter(gridModel.getVisibleLeafColumns(), {field: fieldName});
            if (!cols) return [];

            return cols.map(column => {
                const {renderer, getValueFn} = column;
                return record => {
                    const ctx = {
                            record,
                            field: fieldName,
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

        // Otherwise just match raw.
        // Use expensive get() only when needed to support dot-separated paths.
        return fieldName.includes('.')
            ? rec => get(rec.data, fieldName)
            : rec => rec.data[fieldName];
    }
}
