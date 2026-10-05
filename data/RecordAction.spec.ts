/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {Column, GridModel} from '@xh/hoist/cmp/grid';
import {RecordAction, type StoreRecord} from '@xh/hoist/data';
import {times} from 'lodash';
import {describe, expect, it, vi} from 'vitest';

/**
 * How a RecordAction decides its display state. Grid context menus, action columns and
 * RecordActionBars all render from `getDisplaySpec()`, so its record-count arithmetic decides which
 * actions users can click for the rows they have selected.
 */

// getDisplaySpec() reads only the presence and count of records, so plain stand-ins suffice.
const rec = (id: number) => ({id}) as StoreRecord,
    recs = (count: number) => times(count, i => rec(i + 1));

describe('RecordAction', () => {
    describe('getDisplaySpec', () => {
        it.each<[boolean | number, 'enabled' | 'disabled', number]>([
            [false, 'enabled', 0],
            [false, 'enabled', 3],
            [true, 'disabled', 0],
            [true, 'enabled', 3],
            [1, 'enabled', 1],
            [1, 'disabled', 2],
            [2, 'enabled', 2],
            [0, 'enabled', 0],
            [0, 'disabled', 1]
        ])('with recordsRequired %j, is %s for %i selected records', (required, state, count) => {
            const action = new RecordAction({recordsRequired: required}),
                spec = action.getDisplaySpec({selectedRecords: recs(count)});
            expect(spec.disabled).toBe(state === 'disabled');
        });

        it('counts the clicked record when nothing is selected', () => {
            // E.g. a context menu on a grid with selection disabled, or on a group row.
            const action = new RecordAction({recordsRequired: 1});
            expect(action.getDisplaySpec({record: rec(1), selectedRecords: []}).disabled).toBe(
                false
            );
            expect(action.getDisplaySpec({record: null, selectedRecords: []}).disabled).toBe(true);
        });

        it('counts the selection rather than the clicked record when both are given', () => {
            const action = new RecordAction({recordsRequired: 1}),
                spec = action.getDisplaySpec({record: rec(1), selectedRecords: recs(2)});
            expect(spec.disabled).toBe(true);
        });

        it('applies displayFn output over the configured defaults', () => {
            const displayFn = vi.fn(({record}) => ({text: `Edit #${record.id}`, disabled: false})),
                action = new RecordAction({
                    text: 'Edit',
                    intent: 'primary',
                    recordsRequired: 2,
                    displayFn
                }),
                params = {
                    record: rec(7),
                    selectedRecords: [],
                    gridModel: {} as GridModel,
                    column: {} as Column,
                    extra: 'context'
                };

            const spec = action.getDisplaySpec(params);
            expect(spec).toMatchObject({text: 'Edit #7', intent: 'primary', disabled: false});
            expect(displayFn).toHaveBeenCalledWith({action, ...params});
        });
    });
});
