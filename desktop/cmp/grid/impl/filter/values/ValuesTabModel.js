/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, SizingMode} from '@xh/hoist/core';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {GridAutosizeMode, GridModel} from '@xh/hoist/cmp/grid';
import {checkbox} from '@xh/hoist/desktop/cmp/input';
import {castArray, difference, isEmpty, partition, uniq, without} from 'lodash';
import {FieldType} from '@xh/hoist/data';

export class ValuesTabModel extends HoistModel {
    /** @member {ColumnHeaderFilterModel} */
    headerFilterModel;

    /**
     * @member {GridModel} - Checkbox grid to display enumerated set of values
     */
    @managed @observable.ref gridModel;

    /**
     * @member {*[]} List of currently checked values in the list
     */
    @observable.ref pendingValues = [];

    /** @member {?string} Bound search term for `StoreFilterField` */
    @bindable filterText = null;

    /**
     * @member {Object} - FieldFilter config output by this model
     */
    @computed.struct
    get filter() {
        return this.getFilter();
    }

    @computed
    get allVisibleRecsChecked() {
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
        return this.headerFilterModel.gridFilterModel;
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

    constructor(headerFilterModel) {
        super();
        makeObservable(this);

        this.headerFilterModel = headerFilterModel;
        this.gridModel = this.createGridModel();

        this.addReaction({
            track: () => this.pendingValues,
            run: () => this.syncGrid()
        });
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
    setRecsChecked(isChecked, values) {
        values = castArray(values);
        this.pendingValues = isChecked ?
            uniq([...this.pendingValues, ...values]) :
            without(this.pendingValues, ...values);
    }

    //-------------------
    // Implementation
    //-------------------
    getFilter() {
        const {gridFilterModel, pendingValues, values, valueCount, field} = this,
            included = pendingValues.map(it => gridFilterModel.fromDisplayValue(it)),
            excluded = difference(values, pendingValues).map(it => gridFilterModel.fromDisplayValue(it));

        if (included.length === valueCount || excluded.length === valueCount) {
            return null;
        }

        const {fieldType} = this.headerFilterModel;
        let arr, op;
        if (fieldType === FieldType.ARRAY) {
            arr = included;
            op = 'includes';
        } else {
            const weight = valueCount <= 10 ? 2.5 : 1; // Prefer '=' for short lists
            op = included.length > (excluded.length * weight) ? '!=' : '=';
            arr = op === '=' ? included : excluded;
        }

        if (isEmpty(arr)) return null;

        const value = arr.length === 1 ? arr[0] : arr;
        return {field, op, value};
    }

    @action
    doSyncWithFilter() {
        const {values, columnFilters, gridFilterModel} = this,
            {fieldType} = this.headerFilterModel;

        if (isEmpty(columnFilters)) {
            this.pendingValues = fieldType === FieldType.ARRAY ? [] : values;
            return;
        }

        // We are only interested '!=' filters if we have no '=' filters.
        const [equalsFilters, notEqualsFilters] = partition(columnFilters, f => f.op === '=' || f.op === 'includes'),
            useNotEquals = isEmpty(equalsFilters),
            arr = useNotEquals ? notEqualsFilters : equalsFilters,
            filterValues = [];

        arr.forEach(filter => {
            const newValues = castArray(filter.value).map(value => gridFilterModel.toDisplayValue(value));
            filterValues.push(...newValues); // Todo: Is this safe?
        });

        if (!filterValues.length) return;

        if (useNotEquals) {
            this.pendingValues = difference(values, filterValues);
        } else {
            this.pendingValues = filterValues;
        }
    }

    syncGrid() {
        const {values, pendingValues} = this;
        const data = values.map(value => {
            const isChecked = pendingValues.includes(value);
            return {value, isChecked};
        });
        this.gridModel.loadData(data);
    }

    createGridModel() {
        const {BLANK_STR} = this.gridFilterModel,
            {align, headerAlign, displayName} = this.headerFilterModel.column,
            {fieldType} = this.headerFilterModel,
            renderer = this.fieldSpec.renderer ?? (fieldType !== FieldType.ARRAY ? this.headerFilterModel.column.renderer : null);

        return new GridModel({
            store: {
                idSpec: (raw) => this.fieldSpec.getUniqueValue(raw.value).toString(),
                fields: [
                    {name: 'value', type: 'auto'},
                    {name: 'isChecked', type: 'bool'}
                ]
            },
            selModel: 'disabled',
            emptyText: 'No records found...',
            contextMenu: null,
            autosizeOptions: {mode: GridAutosizeMode.DISABLED},
            sizingMode: SizingMode.COMPACT,
            stripeRows: false,
            sortBy: 'value',
            colDefaults: {sortable: false},
            onRowClicked: ({data: record}) => {
                this.setRecsChecked(!record.get('isChecked'), record.get('value'));
            },
            columns: [
                {
                    field: 'isChecked',
                    headerName: ({gridModel}) => {
                        const {store} = gridModel,
                            values = store.records.map(it => it.get('value'));
                        return checkbox({
                            disabled: store.empty,
                            displayUnsetState: true,
                            value: this.allVisibleRecsChecked,
                            onChange: () => this.setRecsChecked(!this.allVisibleRecsChecked, values)
                        });
                    },
                    width: 30,
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
                    flex: 1,
                    displayName,
                    align,
                    headerAlign,
                    comparator: (v1, v2, sortDir, abs, {defaultComparator}) => {
                        const mul = sortDir === 'desc' ? -1 : 1;
                        if (v1 === BLANK_STR) return 1 * mul;
                        if (v2 === BLANK_STR) return -1 * mul;
                        return defaultComparator(v1, v2);
                    },
                    renderer: (value, context) => {
                        if (value === BLANK_STR) return value;
                        return renderer ? renderer(value, context) : value;
                    }
                }
            ]
        });
    }
}
