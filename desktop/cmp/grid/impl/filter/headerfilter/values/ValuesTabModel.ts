/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridFilterModel, GridModel, GridSorter} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import {FieldFilterSpec} from '@xh/hoist/data';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {castArray, difference, flatten, isEmpty, map, partition, uniq, without} from 'lodash';
import {HeaderFilterModel} from '../HeaderFilterModel';

export class ValuesTabModel extends HoistModel {
    override xhImpl = true;

    headerFilterModel: HeaderFilterModel;

    /** Checkbox grid to display enumerated set of values */
    @managed @observable.ref gridModel: GridModel;

    /** List of currently checked values in the list*/
    @observable.ref pendingValues: any[] = [];

    /** Bound search term for `StoreFilterField` */
    @bindable filterText: string = null;

    /*
     * Merge current filter with pendingValues on commit.
     * Used when commitOnChange is false.
     */
    @bindable combineCurrentFilters: boolean = false;

    /** FieldFilter output by this model. */
    @computed.struct
    get filter(): FieldFilterSpec {
        return this.getFilter();
    }

    @computed
    get allVisibleRecsChecked(): boolean {
        if (!this.gridModel) return false;

        const {records} = this.gridModel.store;
        if (isEmpty(records)) return false;

        const isChecked = records[0].data.isChecked;
        for (let record of records) {
            if (record.data.isChecked !== isChecked) return null;
        }
        return isChecked;
    }

    get field() {
        return this.headerFilterModel.field;
    }

    get fieldSpec() {
        return this.headerFilterModel.fieldSpec;
    }

    get columnFilters() {
        return this.headerFilterModel.columnFilters;
    }

    get gridFilterModel() {
        return this.headerFilterModel.filterModel;
    }

    get values() {
        return this.fieldSpec.values;
    }

    get valueCount() {
        return this.fieldSpec.valueCount;
    }

    get hasHiddenValues() {
        return this.values.length < this.valueCount;
    }

    get sortIcon() {
        const {sort, abs} = this.gridModel.sortBy[0];
        if (sort === 'asc') {
            if (abs) return Icon.sortAbsAsc();
            return Icon.sortAsc();
        }
        if (sort === 'desc') {
            if (abs) return Icon.sortAbsDesc();
            return Icon.sortDesc();
        }
        return null;
    }

    constructor(headerFilterModel: HeaderFilterModel) {
        super();
        makeObservable(this);

        this.headerFilterModel = headerFilterModel;
        this.gridModel = this.createGridModel();
        this.initGridSortBy();

        this.addReaction(
            {
                track: () => this.pendingValues,
                run: () => this.syncGrid(),
                fireImmediately: true
            },
            {
                track: () => this.filterText,
                run: () => this.onFilterTextChange(),
                // Must be longer than the `filterBuffer` on `storeFilterField` since this Grid's
                // filtered RecordSet must be current before `onFilterTextChange` can run.
                debounce: 300
            },
            {
                track: () => this.combineCurrentFilters,
                run: () => this.onCombineCurrentFiltersToggle()
            }
        );
    }

    syncWithFilter() {
        this.doSyncWithFilter();
    }

    @action
    reset() {
        this.filterText = null;
        this.fieldSpec.loadValues();
    }

    @action
    setRecsChecked(isChecked: boolean, values: any[]) {
        values = castArray(values);
        this.pendingValues = isChecked
            ? uniq([...this.pendingValues, ...values])
            : without(this.pendingValues, ...values);
    }

    @action
    toggleSort() {
        const {colId, sort, abs} = this.gridModel.sortBy.find(it => it.colId === 'value'),
            newSort = sort === 'asc' ? 'desc' : 'asc';
        this.gridModel.setSortBy(new GridSorter({colId, sort: newSort, abs}));
    }

    toggleAllRecsChecked() {
        const setAllToChecked = !this.allVisibleRecsChecked,
            values = this.gridModel.store.records.map(it => it.get('value'));
        this.setRecsChecked(setAllToChecked, values);
    }

    //-------------------
    // Implementation
    //-------------------
    @action
    private onFilterTextChange() {
        if (!this.filterText) {
            this.combineCurrentFilters = false;
            this.doSyncWithFilter();
            return;
        }

        const {records} = this.gridModel.store,
            currentFilterValues = flatten(map(this.columnFilters, 'value')),
            checkedRecs = records.filter(
                it =>
                    this.headerFilterModel.commitOnChange ||
                    !isEmpty(currentFilterValues) ||
                    it.get('isChecked')
            ),
            values = map(checkedRecs, it => it.get('value'));

        this.pendingValues = uniq(
            this.combineCurrentFilters ? [...currentFilterValues, ...values] : values
        );
    }

    @action
    private onCombineCurrentFiltersToggle() {
        if (!this.filterText) return;

        const {records} = this.gridModel.store,
            currentFilterValues = flatten(map(this.columnFilters, 'value')),
            checkedRecs = records.filter(it => it.get('isChecked')),
            values = map(checkedRecs, it => it.get('value'));

        this.pendingValues = uniq(
            this.combineCurrentFilters ? [...currentFilterValues, ...values] : values
        );
    }

    private getFilter() {
        const {gridFilterModel, pendingValues, values, valueCount, field} = this,
            included = pendingValues.map(it => gridFilterModel.fromDisplayValue(it)),
            excluded = difference(values, pendingValues).map(it =>
                gridFilterModel.fromDisplayValue(it)
            );

        if (included.length === valueCount || excluded.length === valueCount) {
            return null;
        }

        const {fieldType} = this.headerFilterModel;
        let arr, op;
        if (fieldType === 'tags') {
            arr = included;
            op = 'includes';
        } else {
            const weight = valueCount <= 10 ? 2.5 : 1; // Prefer '=' for short lists
            op = included.length > excluded.length * weight ? '!=' : '=';
            arr = op === '=' ? included : excluded;
        }

        if (isEmpty(arr)) return null;

        const value = arr.length === 1 ? arr[0] : arr;
        return {field, op, value};
    }

    @action
    private doSyncWithFilter() {
        const {values, columnFilters, gridFilterModel, fieldSpec} = this,
            {fieldType} = this.headerFilterModel;

        if (isEmpty(columnFilters)) {
            this.pendingValues = fieldType === 'tags' ? [] : values;
            return;
        }

        // We are only interested '!=' filters if we have no '=' filters.
        const [equalsFilters, notEqualsFilters] = partition(
                columnFilters,
                f => f.op === '=' || f.op === 'includes'
            ),
            useNotEquals = isEmpty(equalsFilters),
            arr = useNotEquals ? notEqualsFilters : equalsFilters,
            filterValues = [];

        arr.forEach(filter => {
            const newValues = castArray(filter.value).map(value => {
                value = fieldSpec.sourceField.parseVal(value);
                return gridFilterModel.toDisplayValue(value);
            });
            filterValues.push(...newValues); // Todo: Is this safe?
        });

        if (!filterValues.length) return;

        if (useNotEquals) {
            this.pendingValues = difference(values, filterValues);
        } else {
            this.pendingValues = filterValues;
        }
    }

    private syncGrid() {
        const {values, pendingValues} = this;
        const data = values.map(value => {
            const isChecked = pendingValues.includes(value);
            return {value, isChecked};
        });
        this.gridModel.loadData(data);
    }

    private initGridSortBy() {
        const column = this.headerFilterModel.parent.column,
            [colGridSorter] = column.gridModel.sortBy
                .toString()
                .split(',')
                .map(it => GridSorter.parse(it))
                .filter(it => it.colId === this.field),
            gridSorter = new GridSorter({
                colId: 'value',
                sort: colGridSorter?.sort ?? 'asc',
                abs: column?.absSort || colGridSorter?.abs
            });
        this.gridModel.setSortBy(gridSorter);
    }

    private createGridModel() {
        const {BLANK_PLACEHOLDER} = GridFilterModel,
            {headerFilterModel, fieldSpec} = this,
            {fieldType} = headerFilterModel,
            renderer =
                fieldSpec.renderer ??
                (fieldType !== 'tags' ? this.headerFilterModel.parent.column.renderer : null);

        return new GridModel({
            store: {
                idSpec: raw => fieldSpec.getUniqueValue(raw.value).toString(),
                fields: [
                    {name: 'value', type: 'auto'},
                    {name: 'isChecked', type: 'bool'}
                ]
            },
            selModel: 'single',
            emptyText: 'No records found...',
            contextMenu: null,
            // Autosize enabled to ensure that long values don't get clipped and user can scroll
            // right if necessary to view full string. For longer strings that differ only in their
            // endings this is important - e.g. instrument or contract names ending in a date.
            autosizeOptions: {mode: 'managed'},
            sizingMode: 'compact',
            stripeRows: false,
            sortBy: 'value',
            onRowClicked: ({data: record}) => {
                this.setRecsChecked(!record.get('isChecked'), record.get('value'));
            },
            onKeyDown: evt => {
                if (evt.key === ' ' || evt.code.toUpperCase() === 'SPACE') {
                    const record = this.gridModel.selectedRecord;
                    this.setRecsChecked(!record.get('isChecked'), record.get('value'));
                }
            },
            hideHeaders: true,
            columns: [
                {
                    field: 'isChecked',
                    width: 28,
                    autosizable: false,
                    pinned: true,
                    align: 'center',
                    headerAlign: 'center',
                    sortable: false,
                    rendererIsComplex: true,
                    renderer: (v, {record}) => {
                        return checkbox({
                            displayUnsetState: true,
                            value: record.data.isChecked,
                            onChange: () => this.setRecsChecked(!v, record.get('value'))
                        });
                    }
                },
                {
                    field: 'value',
                    align: 'left',
                    comparator: (v1, v2, sortDir, abs, {defaultComparator}) => {
                        const mul = sortDir === 'desc' ? -1 : 1;
                        if (v1 === BLANK_PLACEHOLDER) return 1 * mul;
                        if (v2 === BLANK_PLACEHOLDER) return -1 * mul;
                        return defaultComparator(v1, v2);
                    },
                    renderer: (value, context) => {
                        if (value === BLANK_PLACEHOLDER) return value;
                        return renderer ? renderer(value, context) : value;
                    }
                }
            ],
            xhImpl: true
        });
    }
}
