/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type Constraint, numberIs, required, Store, type StoreConfig} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Store validation - Field rules run against a Store's records. Editable grids show the results on
 * their cells, and apps gate saves on `store.isValid` or `store.validateAsync()`. Only uncommitted
 * records (added or locally modified) are validated, which is easy to misread: data loaded from
 * the server is never checked.
 */

beforeAll(() => initTestAppAsync());

function createStore(config: Partial<StoreConfig> = {}): Store {
    const store = new Store({
        fields: [
            {name: 'name', type: 'string', rules: [required]},
            {name: 'qty', type: 'number', rules: [numberIs({min: 0})]}
        ],
        data: [
            {id: 1, name: 'Apple', qty: 1},
            {id: 2, name: 'Pear', qty: 2}
        ],
        ...config
    });
    onTestFinished(() => store.destroy());
    return store;
}

/** Validation runs async even for sync rules - a macrotask lets it settle. */
const settle = () => wait();

/** An async rule result with its resolve function, to control when the rule completes. */
function deferred() {
    let resolve: (result: string) => void;
    const promise = new Promise<string>(r => (resolve = r));
    return {promise, resolve};
}
type Deferred = ReturnType<typeof deferred>;

describe('Store', () => {
    describe('validation', () => {
        it('does not validate committed records, even when their data breaks a rule', async () => {
            const store = createStore({data: [{id: 1, name: null, qty: -1}]});
            await settle();

            expect(store.getById(1).validationState).toBe('Unknown');
            expect(store.isValid).toBe(true);
            expect(await store.validateAsync()).toBe(true);
        });

        it('validates records once they are added or modified', async () => {
            const store = createStore();
            store.addRecords({id: 3, name: null});
            store.modifyRecords({id: 1, qty: -1});
            await settle();

            expect(store.getById(3).errors.name).toEqual(['Name is required.']);
            expect(store.getById(1).errors.qty).toEqual([
                'Qty must be greater than or equal to 0.'
            ]);
            expect(store.getById(2).validationState).toBe('Unknown');
            expect(store.isNotValid).toBe(true);
            expect(store.errorCount).toBe(2);
            expect(store.errors[3].name).toEqual(['Name is required.']);
        });

        // Fixed in 66.0.0 - records added right after construction were never validated.
        it('validates records added immediately after the store is created', async () => {
            const store = createStore({data: null});
            store.addRecords({id: 1, name: null});
            await settle();

            expect(store.getById(1).isNotValid).toBe(true);
        });

        // Changed in 87.0.0 - such records reported a permanent 'Unknown'.
        it('reports records Valid in a store with no rules', async () => {
            const store = createStore({fields: ['name']});
            store.modifyRecords({id: 1, name: null});
            await settle();

            expect(store.getById(1).validationState).toBe('Valid');
            expect(store.isValid).toBe(true);
        });

        it('clears errors once an invalid value is fixed', async () => {
            const store = createStore();
            store.modifyRecords({id: 1, name: ''});
            await settle();
            expect(store.getById(1).isNotValid).toBe(true);

            store.modifyRecords({id: 1, name: 'Plum'});
            await settle();
            expect(store.getById(1).isValid).toBe(true);
            expect(store.getById(1).allErrors).toEqual([]);
            expect(store.isValid).toBe(true);
        });

        it('returns to Valid when local changes are reverted', async () => {
            const store = createStore();
            store.addRecords({id: 3, name: null});
            store.modifyRecords({id: 1, qty: -1});
            await settle();
            expect(store.isNotValid).toBe(true);

            store.revert();
            await settle();
            expect(store.isValid).toBe(true);
            expect(store.errorCount).toBe(0);
        });

        it('treats warning results as non-blocking', async () => {
            const warning = {severity: 'warning', message: 'Unusually large.'} as const,
                store = createStore({
                    fields: [{name: 'qty', rules: [({value}) => (value > 100 ? warning : null)]}]
                });
            store.modifyRecords({id: 1, qty: 500});
            await settle();

            const rec = store.getById(1);
            expect(rec.isValid).toBe(true);
            expect(rec.errorCount).toBe(0);
            expect(rec.validationResults.qty).toEqual([warning]);
            expect(store.isValid).toBe(true);
            expect(store.allValidationResults).toEqual([warning]);
        });
    });

    describe('validation rules', () => {
        it('applies a rule only while its when condition holds', async () => {
            const store = createStore({
                fields: [
                    'type',
                    {
                        name: 'limit',
                        rules: [{when: (f, values) => values.type === 'LIMIT', check: required}]
                    }
                ],
                data: [{id: 1, type: 'MARKET', limit: 10}]
            });

            store.modifyRecords({id: 1, limit: null});
            await settle();
            expect(store.getById(1).isValid).toBe(true);

            store.modifyRecords({id: 1, type: 'LIMIT'});
            await settle();
            expect(store.getById(1).errors.limit).toEqual(['Limit is required.']);
        });

        it('passes constraints the field state and all values of the record', async () => {
            const constraint = vi.fn<Constraint>(() => null),
                store = createStore({
                    fields: ['start', {name: 'end', rules: [constraint]}],
                    data: [{id: 1, start: 1, end: 2}]
                });
            store.modifyRecords({id: 1, end: 3});
            await settle();

            const rec = store.getById(1);
            expect(constraint).toHaveBeenCalledWith(
                {value: 3, name: 'end', displayName: 'End', record: rec},
                {id: 1, start: 1, end: 3}
            );
        });
    });

    describe('validationIsComplex', () => {
        // A rule that depends on other records - the case validationIsComplex exists for.
        const uniqueName: Constraint = ({value, record}) =>
            record.store.allRecords.some(it => it.id !== record.id && it.get('name') === value)
                ? 'Name must be unique.'
                : null;

        it('revalidates every uncommitted record on each change when true', async () => {
            const store = createStore({
                validationIsComplex: true,
                fields: [{name: 'name', rules: [uniqueName]}]
            });
            store.addRecords({id: 3, name: 'Plum'});
            await settle();
            expect(store.getById(3).isValid).toBe(true);

            store.addRecords({id: 4, name: 'Plum'});
            await settle();
            expect(store.getById(3).isNotValid).toBe(true);
            expect(store.getById(4).isNotValid).toBe(true);
        });

        it('revalidates only the changed records when false', async () => {
            const store = createStore({fields: [{name: 'name', rules: [uniqueName]}]});
            store.addRecords({id: 3, name: 'Plum'});
            await settle();

            store.addRecords({id: 4, name: 'Plum'});
            await settle();
            expect(store.getById(3).isValid).toBe(true);
            expect(store.getById(4).isNotValid).toBe(true);
        });
    });

    describe('validateAsync', () => {
        it('resolves to whether the uncommitted records are valid', async () => {
            const store = createStore();
            store.modifyRecords({id: 1, name: null});
            await settle();
            expect(await store.validateAsync()).toBe(false);

            store.modifyRecords({id: 1, name: 'Plum'});
            await settle();
            expect(await store.validateAsync()).toBe(true);
        });

        // BUG: StoreValidator.validateAsync (StoreValidator.ts:98) validates the installed
        // validators only. The sync that a change starts installs its validators once it completes
        // (StoreValidator.ts:168-169), so a record changed just before the call is not checked.
        it.fails('checks records changed just before it is called', async () => {
            const store = createStore();
            store.modifyRecords({id: 1, name: null});
            expect(await store.validateAsync()).toBe(false);
        });
    });

    describe('async validation', () => {
        it('reports pending while an async rule revalidates a record', async () => {
            const results = new Map<string, Deferred>(),
                store = createStore({
                    fields: [{name: 'name', rules: [({value}) => results.get(value).promise]}]
                });
            ['Plum', 'Taken'].forEach(it => results.set(it, deferred()));

            store.modifyRecords({id: 1, name: 'Plum'});
            results.get('Plum').resolve(null);
            await settle();
            expect(store.getById(1).isValid).toBe(true);

            store.modifyRecords({id: 1, name: 'Taken'});
            await settle();
            expect(store.getById(1).isValidationPending).toBe(true);
            expect(store.validator.isPending).toBe(true);

            results.get('Taken').resolve('Name is taken.');
            await settle();
            expect(store.getById(1).isValidationPending).toBe(false);
            expect(store.getById(1).errors.name).toEqual(['Name is taken.']);
            expect(store.isNotValid).toBe(true);
        });

        // Guards the stale-run check in RecordValidator.validateAsync().
        it('keeps the result for the latest value when results arrive out of order', async () => {
            const results = new Map<string, Deferred>(),
                store = createStore({
                    fields: [{name: 'name', rules: [({value}) => results.get(value).promise]}]
                });
            ['Plum', 'Taken', 'Free'].forEach(it => results.set(it, deferred()));

            store.modifyRecords({id: 1, name: 'Plum'});
            results.get('Plum').resolve(null);
            await settle();

            store.modifyRecords({id: 1, name: 'Taken'});
            store.modifyRecords({id: 1, name: 'Free'});
            results.get('Free').resolve(null);
            await settle();
            results.get('Taken').resolve('Name is taken.');
            await settle();

            expect(store.getById(1).get('name')).toBe('Free');
            expect(store.getById(1).isValid).toBe(true);
            expect(store.isValid).toBe(true);
        });

        // BUG: StoreValidator installs a record's validator only after its first validation
        // completes (StoreValidator.ts:168-169). Until then the record has no validator, so the
        // store reports Valid and nothing reports pending - a save gated on isValid goes through.
        it.fails('is pending, not valid, while an async rule first runs on a record', async () => {
            const result = deferred(),
                store = createStore({fields: [{name: 'name', rules: [() => result.promise]}]});
            store.modifyRecords({id: 1, name: 'Taken'});
            await settle();

            expect(store.getById(1).isValidationPending).toBe(true);
            expect(store.isValid).toBe(false);
        });
    });
});
