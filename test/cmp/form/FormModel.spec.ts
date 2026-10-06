/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type FormConfig, FormModel, type FormPersistOptions} from '@xh/hoist/cmp/form';
import {required} from '@xh/hoist/data';
import {reaction} from '@xh/hoist/mobx';
import {LocalDate} from '@xh/hoist/utils/datetime';
import {describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * FormModel - the state behind every edit dialog and form panel. Apps load records with `init()`,
 * enable Save from `isDirty` and `isValid`, send `getData()` to the server, and prompt about
 * unsaved changes. These tests pin the data lifecycle and form-wide state those flows rely on.
 */

function createForm(config: FormConfig): FormModel {
    const ret = new FormModel(config);
    onTestFinished(() => ret.destroy());
    return ret;
}

describe('FormModel', () => {
    describe('init', () => {
        // Changed in 41.0.0 (#2477) - init() previously kept the prior init() value of any field
        // it was not given.
        it('falls back to the configured initialValue for fields not provided', () => {
            const form = createForm({
                fields: [
                    {name: 'name'},
                    {name: 'status', initialValue: 'Draft'},
                    {name: 'priority', initialValue: 'Low'}
                ]
            });
            form.init({name: 'Report', status: 'Final', priority: 'High'});

            form.init({name: 'Copy', priority: null});
            expect(form.getData()).toEqual({name: 'Copy', status: 'Draft', priority: null});
            expect(form.isDirty).toBe(false);
        });

        it('re-evaluates a function initialValue on each init()', () => {
            let today = LocalDate.get('2026-03-02');
            const form = createForm({fields: [{name: 'day', initialValue: () => today}]});
            expect(form.values.day).toBe(today);

            today = today.nextDay();
            form.init();
            expect(form.values.day).toBe(today);
        });

        it('makes the given values the baseline for isDirty and reset()', () => {
            const form = createForm({fields: [{name: 'name'}, {name: 'qty'}]});
            form.init({name: 'Widget', qty: 5});
            expect(form.isDirty).toBe(false);

            form.setValues({qty: 6});
            expect(form.isDirty).toBe(true);

            form.reset();
            expect(form.isDirty).toBe(false);
            expect(form.getData()).toEqual({name: 'Widget', qty: 5});
        });
    });

    describe('isDirty', () => {
        // Fixed in 52.0.2 (#3161) - equal copies of an array or object were dirty.
        it('compares values deeply, so an equal copy is not a change', () => {
            const form = createForm({
                fields: [
                    {name: 'tags', initialValue: ['a', 'b']},
                    {name: 'range', initialValue: {min: 1, max: 5}}
                ]
            });

            form.setValues({tags: ['a', 'b'], range: {min: 1, max: 5}});
            expect(form.isDirty).toBe(false);

            form.setValues({range: {min: 1, max: 6}});
            expect(form.isDirty).toBe(true);
            expect(form.getField('tags').isDirty).toBe(false);
        });
    });

    describe('getData', () => {
        it('returns only changed fields when dirtyOnly is true', () => {
            const form = createForm({
                fields: [{name: 'name'}, {name: 'qty'}, {name: 'notes'}],
                initialValues: {name: 'Widget', qty: 5}
            });
            form.setValues({qty: 6, notes: 'Rush'});

            expect(form.getData(true)).toEqual({qty: 6, notes: 'Rush'});
        });
    });

    describe('values', () => {
        it('tracks each field separately when read in a reaction', () => {
            const form = createForm({fields: [{name: 'country'}, {name: 'city'}]}),
                run = vi.fn(),
                dispose = reaction(() => form.values.country, run);
            onTestFinished(dispose);

            form.setValues({city: 'Paris'});
            expect(run).not.toHaveBeenCalled();

            form.setValues({country: 'France'});
            expect(run).toHaveBeenCalledOnce();
            expect(run.mock.calls[0][0]).toBe('France');
        });
    });

    describe('disabled and readonly', () => {
        it('apply to every field, on top of any field-level setting', () => {
            const form = createForm({
                    fields: [{name: 'name'}, {name: 'id', disabled: true, readonly: true}]
                }),
                {name, id} = form.fields;

            form.disabled = true;
            form.readonly = true;
            expect([name.disabled, name.readonly]).toEqual([true, true]);

            form.disabled = false;
            form.readonly = false;
            expect([name.disabled, name.readonly]).toEqual([false, false]);
            expect([id.disabled, id.readonly]).toEqual([true, true]);
        });
    });

    describe('validateAsync', () => {
        it('resolves false and displays errors on every field, edited or not', async () => {
            const form = createForm({
                fields: [
                    {name: 'name', rules: [required]},
                    {name: 'email', rules: [required]},
                    {name: 'notes'}
                ]
            });

            expect(await form.validateAsync()).toBe(false);
            expect(form.allErrors).toEqual(['Name is required.', 'Email is required.']);
            expect(form.fieldList.every(it => it.validationDisplayed)).toBe(true);

            form.setValues({name: 'Jane', email: 'jane@example.com'});
            expect(await form.validateAsync()).toBe(true);
            expect(form.allErrors).toEqual([]);
        });

        it('leaves errors hidden when display is false', async () => {
            const form = createForm({fields: [{name: 'name', rules: [required]}]});

            expect(await form.validateAsync({display: false})).toBe(false);
            expect(form.getField('name').validationDisplayed).toBe(false);
        });
    });

    describe('persistWith', () => {
        /** Persist options that store state as JSON, as the pref and local storage providers do. */
        function jsonStore(opts: Partial<FormPersistOptions> = {}) {
            let json: string = null;
            return {
                getJson: () => json,
                persistWith: {
                    getData: () => (json ? JSON.parse(json) : {}),
                    setData: (data: object) => (json = JSON.stringify(data)),
                    debounce: 0,
                    ...opts
                }
            };
        }

        // Added in 73.0.0 (#3946) - dates are tagged so they survive JSON storage.
        it('restores Date and LocalDate values as their original types', () => {
            const {persistWith} = jsonStore(),
                fields = [{name: 'start'}, {name: 'asOf'}, {name: 'days'}],
                start = new Date('2026-03-02T14:30:00Z'),
                asOf = LocalDate.get('2026-03-02');

            createForm({fields, persistWith}).setValues({start, asOf, days: [asOf]});

            const restored = createForm({fields, persistWith}).values;
            expect(restored.start).toBeInstanceOf(Date);
            expect(restored.start.getTime()).toBe(start.getTime());
            expect(restored.asOf).toBe(asOf);
            expect(restored.days).toEqual([asOf]);
        });

        it('leaves excludeFields out of persisted state', () => {
            const {persistWith, getJson} = jsonStore({excludeFields: ['password']}),
                fields = [{name: 'username'}, {name: 'password'}];

            createForm({fields, persistWith}).setValues({username: 'jdoe', password: 'hunter2'});
            expect(getJson()).not.toContain('hunter2');

            const restored = createForm({fields, persistWith});
            expect(restored.getData()).toEqual({username: 'jdoe', password: null});
        });
    });
});
