/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {Column} from '@xh/hoist/cmp/grid';
import {HoistModel} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {isEmpty} from 'lodash';
import {GridFilterModel} from '@xh/hoist/cmp/grid';

export class ColumnHeaderFilterModel extends HoistModel {
    override xhImpl = true;

    readonly column: Column;
    readonly filterModel: GridFilterModel;

    @observable isOpen: boolean = false;

    get hasFilter() {
        const filters = this.filterModel.getColumnFilters(this.column.field);
        return !isEmpty(filters);
    }

    constructor(filterModel: GridFilterModel, column: Column) {
        super();
        makeObservable(this);
        this.filterModel = filterModel;
        this.column = column;
    }

    @action
    open() {
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }
}
