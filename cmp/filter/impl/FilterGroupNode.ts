/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistBase} from '@xh/hoist/core';
import {CompoundFilter, FieldFilter, Filter} from '@xh/hoist/data';
import {CompoundFilterOperator} from '@xh/hoist/data/filter/Types';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {compact} from 'lodash';
import {FilterRuleNode} from './FilterRuleNode';

export type FilterNode = FilterGroupNode | FilterRuleNode;

/**
 * Mutable observable node representing a compound filter group in the working tree.
 * @internal
 */
export class FilterGroupNode extends HoistBase {
    @observable op: CompoundFilterOperator = 'AND';
    @observable not: boolean = false;
    @observable.ref children: FilterNode[] = [];

    constructor() {
        super();
        makeObservable(this);
    }

    @computed
    get isEmpty(): boolean {
        return this.children.length === 0;
    }

    @computed
    get isComplete(): boolean {
        return (
            this.children.length > 0 &&
            this.children.every(child =>
                child instanceof FilterGroupNode ? child.isComplete : child.isComplete
            )
        );
    }

    /** Convert to an immutable CompoundFilter, or null if empty. */
    toFilter(): CompoundFilter {
        const filters = compact(this.children.map(child => child.toFilter())),
            {op, not} = this;
        if (filters.length === 0) return null;
        return new CompoundFilter({filters, op, not});
    }

    @action
    addRule(): FilterRuleNode {
        const rule = new FilterRuleNode();
        this.children = [...this.children, rule];
        return rule;
    }

    @action
    addGroup(): FilterGroupNode {
        const group = new FilterGroupNode();
        this.children = [...this.children, group];
        return group;
    }

    @action
    removeChild(child: FilterNode) {
        this.children = this.children.filter(c => c !== child);
        child.destroy();
    }

    @action
    moveChild(child: FilterNode, direction: 'up' | 'down') {
        const children = [...this.children],
            idx = children.indexOf(child);
        if (idx < 0) return;

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= children.length) return;

        children[idx] = children[targetIdx];
        children[targetIdx] = child;
        this.children = children;
    }

    @action
    setOp(op: CompoundFilterOperator) {
        this.op = op;
    }

    @action
    setNot(not: boolean) {
        this.not = not;
    }

    /** Convert an immutable Filter into a mutable working tree for editing. */
    static fromFilter(filter: Filter): FilterGroupNode {
        const group = new FilterGroupNode();
        if (!filter) return group;

        if (CompoundFilter.isCompoundFilter(filter)) {
            group.op = filter.op === 'AND' || filter.op === 'and' ? 'AND' : 'OR';
            group.not = filter.not;
            group.children = filter.filters
                .map(child => {
                    if (CompoundFilter.isCompoundFilter(child)) {
                        return FilterGroupNode.fromFilter(child);
                    }
                    if (FieldFilter.isFieldFilter(child)) {
                        return FilterRuleNode.fromFilter(child);
                    }
                    // Unsupported filter type — skip
                    return null;
                })
                .filter(Boolean);
            return group;
        }

        if (FieldFilter.isFieldFilter(filter)) {
            group.children = [FilterRuleNode.fromFilter(filter)];
            return group;
        }

        // Unsupported filter type — return empty group
        return group;
    }

    override destroy() {
        this.children.forEach(child => child.destroy());
        super.destroy();
    }
}
