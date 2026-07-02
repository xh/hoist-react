/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {
    CompoundFilterOperator,
    FieldFilter,
    FieldFilterOperator,
    FieldFilterSpec,
    FilterLike
} from '@xh/hoist/data';
import {action, bindable, computed, observable} from '@xh/hoist/mobx';
import {compact, first, flatMap, forEach, groupBy, isArray, isEmpty, uniq} from 'lodash';
import {HeaderFilterModel} from '../HeaderFilterModel';

import {CustomRowModel, usesMultiValueInput} from './CustomRowModel';

export class CustomTabModel extends HoistModel {
    override xhImpl = true;

    headerFilterModel: HeaderFilterModel;

    @bindable accessor op: CompoundFilterOperator = 'AND';
    @observable.ref accessor rowModels: CustomRowModel[] = [];

    /** Filter config output by this model. */
    @computed.struct
    get filter(): FilterLike {
        const {op, rowModels} = this;

        // Null rowModels flags an unrepresentable filter - emit it unchanged so commit is a no-op.
        if (!rowModels) return this.columnCompoundFilter ?? this.columnFilters;

        const specs = compact(rowModels.map(it => it.value));
        if (isEmpty(specs)) return null;

        const filters = this.collapseToArrayFilters(specs, op);
        return filters.length > 1 ? {filters, op} : first(filters);
    }

    get fieldSpec() {
        return this.headerFilterModel.fieldSpec;
    }

    get currentGridFilter() {
        return this.headerFilterModel.currentGridFilter;
    }

    get columnFilters() {
        return this.headerFilterModel.columnFilters;
    }

    get columnCompoundFilter() {
        return this.headerFilterModel.columnCompoundFilter;
    }

    constructor(headerFilterModel: HeaderFilterModel) {
        super();
        this.headerFilterModel = headerFilterModel;
    }

    syncWithFilter() {
        this.doSyncWithFilter();
    }

    @action
    reset() {
        XH.safeDestroy(this.rowModels);
        this.rowModels = [new CustomRowModel(this)];
    }

    @action
    addEmptyRow() {
        this.rowModels = [...this.rowModels, new CustomRowModel(this)];
    }

    @action
    removeRow(model) {
        this.rowModels = this.rowModels.filter(it => it.xhId !== model.xhId);
        XH.safeDestroy(model);
    }

    //-------------------
    // Implementation
    //-------------------
    @action
    private doSyncWithFilter() {
        const {columnCompoundFilter} = this,
            op = this.deriveOp();
        this.op = op;

        if (!this.isRepresentable) {
            this.logWarn('Filter cannot be edited in the custom tab; leaving it unchanged');
            this.rowModels = null;
            return;
        }

        // Expand a multi-value clause destined for a single-value input into one row per value
        // (joined under the tab op); the multi-select input holds the array directly as one row.
        const rowModels = [],
            children = (columnCompoundFilter?.filters ?? this.columnFilters) as FieldFilter[];
        children.forEach(filter => {
            const {op: fieldOp, value} = filter;
            if (this.needsExpansion(filter)) {
                value.forEach(v => rowModels.push(new CustomRowModel(this, fieldOp, v)));
            } else {
                rowModels.push(new CustomRowModel(this, fieldOp, value));
            }
        });

        // Add an empty pending row
        if (isEmpty(rowModels)) {
            rowModels.push(new CustomRowModel(this));
        }

        this.rowModels = rowModels;
    }

    // Whether a multi-value clause must be expanded to one row per value (vs held by a multi-select).
    private needsExpansion({op, value}: FieldFilter): boolean {
        return isArray(value) && value.length > 1 && !usesMultiValueInput(this.fieldSpec, op);
    }

    // The op a multi-value clause joins under: `=`-family => OR, negated => AND.
    private mergeOpFor(op: FieldFilterOperator): CompoundFilterOperator {
        return FieldFilter.INCLUDE_LIKE_OPERATORS.includes(op) ? 'OR' : 'AND';
    }

    // Op joining the tab's rows
    private deriveOp(): CompoundFilterOperator {
        const {columnCompoundFilter, columnFilters} = this;
        if (columnCompoundFilter) return columnCompoundFilter.op;

        const arrayFilter = columnFilters.find(f => this.needsExpansion(f));
        return arrayFilter ? this.mergeOpFor(arrayFilter.op) : 'AND';
    }

    // Filter must be representable as a flat set of rows with a single op
    private get isRepresentable(): boolean {
        const {columnCompoundFilter} = this,
            op = this.deriveOp(),
            children = columnCompoundFilter?.filters ?? this.columnFilters;
        return children.every(
            f =>
                FieldFilter.isFieldFilter(f) &&
                (!this.needsExpansion(f) || op === this.mergeOpFor(f.op))
        );
    }

    // Inverse of the expand in `doSyncWithFilter`: collapse same-field/op rows into one multi-value FieldFilter
    private collapseToArrayFilters(
        specs: FieldFilterSpec[],
        op: CompoundFilterOperator
    ): FieldFilterSpec[] {
        const ret: FieldFilterSpec[] = [];
        forEach(groupBy(specs, 'op'), (groupSpecs, groupOp: FieldFilterOperator) => {
            const canMerge =
                groupSpecs.length > 1 &&
                FieldFilter.ARRAY_OPERATORS.includes(groupOp) &&
                op === this.mergeOpFor(groupOp);

            if (canMerge) {
                const {field} = groupSpecs[0],
                    value = uniq(flatMap(groupSpecs, it => it.value));
                ret.push({field, op: groupOp, value});
            } else {
                ret.push(...groupSpecs);
            }
        });
        return ret;
    }
}
