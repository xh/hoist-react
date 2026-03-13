/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';
import {FieldFilter} from '@xh/hoist/data';
import {FieldFilterOperator} from '@xh/hoist/data/filter/Types';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';

/**
 * Mutable observable node representing a single filter rule in the working tree.
 * @internal
 */
export class FilterRuleNode extends HoistBase {
    @observable field: string = null;
    @observable op: FieldFilterOperator = null;
    @observable value: any = null;

    constructor() {
        super();
        makeObservable(this);
    }

    @computed
    get isComplete(): boolean {
        const {field, op, value} = this;
        return field != null && op != null && value != null;
    }

    /** Convert to an immutable FieldFilter, or null if incomplete. */
    toFilter(): FieldFilter {
        if (!this.isComplete) return null;
        const {field, op, value} = this;
        return new FieldFilter({field, op, value});
    }

    @action
    setField(field: string) {
        this.field = field;
    }

    @action
    setOp(op: FieldFilterOperator) {
        this.op = op;
    }

    @action
    setValue(value: any) {
        this.value = value;
    }

    @action
    clear() {
        this.field = null;
        this.op = null;
        this.value = null;
    }

    /** Create a FilterRuleNode from an existing FieldFilter. */
    static fromFilter(filter: FieldFilter): FilterRuleNode {
        const node = new FilterRuleNode();
        node.field = filter.field;
        node.op = filter.op;
        node.value = filter.value;
        return node;
    }
}
