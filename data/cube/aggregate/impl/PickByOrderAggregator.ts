/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {throwIf} from '@xh/hoist/utils/js';
import {Aggregator} from '../Aggregator';

/** The leaf a row picks: its value, and the order that won it. */
interface Pick {
    value: unknown;
    order: unknown;
}

/**
 * Base of {@link FirstAggregator} and {@link LastAggregator}: the value of one leaf, chosen by a
 * second field. Composes from direct children through each child's pick, held as aggregator
 * state.
 * @internal
 */
export abstract class PickByOrderAggregator extends Aggregator {
    readonly orderField: string;
    private readonly _dependsOn: string[];

    constructor({orderField}: {orderField: string}) {
        super();
        throwIf(!orderField, `${this.constructor.name} requires an orderField.`);
        this.orderField = orderField;
        this._dependsOn = [orderField];
    }

    override get dependsOn() {
        return this._dependsOn;
    }

    /** True if order `a` beats order `b`. Ties keep the pick met first. */
    protected abstract beats(a: unknown, b: unknown): boolean;

    override aggregate(rows, fieldName, context) {
        let best: Pick = null;
        for (const row of rows) {
            const pick: Pick = row.isLeaf
                ? {
                      value: row.cubeRecord.data[fieldName],
                      order: row.cubeRecord.data[this.orderField]
                  }
                : context.getAggState(row);
            if (pick?.value == null || pick.order == null) continue;
            if (!best || this.beats(pick.order, best.order)) best = pick;
        }
        context.setAggState(best);
        return best?.value ?? null;
    }
}
