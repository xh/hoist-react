/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Store} from '@xh/hoist/data';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {range} from 'lodash';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * `StoreRecord.getValues()` is how apps copy a record's full data - for an export, an edit form or
 * an update transaction. Record `data` hides defaults on a prototype when few fields are set, so
 * `getValues()` is the one way to get every field as an own property.
 */
describe('StoreRecord', () => {
    beforeAll(() => initTestAppAsync());

    describe('getValues', () => {
        it.each([
            ['a sparse record', 2],
            ['a dense record', 40]
        ])('returns the id, then an own property for every field, for %s', (_, populated) => {
            const names = range(40).map(i => `f${i}`),
                store = newStore(names),
                row = {id: 1, ...Object.fromEntries(names.slice(0, populated).map(n => [n, n]))};
            store.loadData([row]);

            const values = store.getById(1).getValues();
            expect(Object.keys(values)).toEqual(['id', ...names]);
            names.forEach((n, i) => expect(values[n]).toBe(i < populated ? n : 'dflt'));
        });

        it('returns a new object on each call, which a caller may change', () => {
            const store = newStore(['a', 'b']);
            store.loadData([{id: 1, a: 'x'}]);
            const rec = store.getById(1),
                first = rec.getValues();

            first.a = 'changed';
            first.extra = true;

            expect(rec.getValues()).toEqual({id: 1, a: 'x', b: 'dflt'});
            expect(rec.data.a).toBe('x');
            expect(store.getById(1).getValues()).not.toBe(first);
        });
    });
});

function newStore(names: string[]): Store {
    const ret = new Store({fields: names.map(name => ({name, defaultValue: 'dflt'}))});
    onTestFinished(() => ret.destroy());
    return ret;
}
