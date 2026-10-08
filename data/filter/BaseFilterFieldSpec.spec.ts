/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {BaseFilterFieldSpec, Store, type BaseFilterFieldSpecConfig} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {afterAll, beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * Defaults that BaseFilterFieldSpec derives from a source Store's fields. They decide how grid
 * column filters and FilterChooser filter each field, and whether they suggest its values.
 */
describe('BaseFilterFieldSpec', () => {
    let store: Store;

    beforeAll(async () => {
        await initTestAppAsync();
        store = new Store({
            fields: [
                {name: 'name', type: 'string'},
                {name: 'qty', type: 'int'},
                {name: 'price', type: 'number'},
                {name: 'tradeTime', type: 'date'},
                {name: 'tradeDate', type: 'localDate'}
            ]
        });
    });

    afterAll(() => store?.destroy());

    function createSpec(field: string, config: Partial<BaseFilterFieldSpecConfig> = {}) {
        const spec = new TestFieldSpec({field, source: store, ...config});
        onTestFinished(() => spec.destroy());
        return spec;
    }

    describe('fieldType', () => {
        // v86.1.0 (e6facb56c, #3338) - so filters on a timestamp compare whole calendar days.
        it('defaults to localDate for a timestamp source field', () => {
            expect(createSpec('tradeTime').fieldType).toBe('localDate');
            expect(createSpec('tradeTime', {fieldType: 'date'}).fieldType).toBe('date');
        });
    });

    describe('enableValues', () => {
        // Fields with effectively unbounded distinct values should not list them as suggestions.
        it.each([
            ['name', true],
            ['tradeDate', true],
            ['qty', false],
            ['price', false],
            // Filtered as a localDate, but its values are still unbounded timestamps.
            ['tradeTime', false]
        ])('defaults for the %s field to %s', (field, expected) => {
            expect(createSpec(field).enableValues).toBe(expected);
        });

        it('is true when explicit values are given', () => {
            expect(createSpec('qty', {values: [1, 2, 3]}).enableValues).toBe(true);
        });
    });

    describe('values', () => {
        // Fixed in 89.0.0 - removing nulls also dropped 0, false and ''.
        it('removes nulls from explicit values, but keeps 0', () => {
            expect(createSpec('qty', {values: [0, 1, 2, null]}).values).toEqual([0, 1, 2]);
        });
    });
});

/** Minimal concrete spec - the base class leaves loading values from the source to subclasses. */
class TestFieldSpec extends BaseFilterFieldSpec {
    loadValuesFromSource() {}
}
