/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type FormConfig, FormModel, SubformsFieldModel} from '@xh/hoist/cmp/form';
import {required} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {sumBy} from 'lodash';
import {describe, expect, it, onTestFinished} from 'vitest';

/**
 * SubformsFieldModel - a form field holding a list of rows, each edited by its own FormModel. It
 * backs editors for line items, splits, and other nested lists. Dirty state, reset, and validation
 * must cover the rows as well as the list itself, or Save buttons and unsaved-changes prompts go
 * wrong for the most complex forms in an app.
 */

/** A form with an `items` field of rows, each with a required `product` and a `qty`. */
function createForm(config: Partial<FormConfig> = {}): FormModel {
    const ret = new FormModel({
        fields: [
            {
                name: 'items',
                subforms: {
                    fields: [{name: 'product', rules: [required]}, {name: 'qty'}],
                    initialValues: {qty: 1}
                }
            }
        ],
        initialValues: {
            items: [
                {product: 'Apple', qty: 2},
                {product: 'Pear', qty: 3}
            ]
        },
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

function getItems(form: FormModel): SubformsFieldModel {
    return form.getField('items') as SubformsFieldModel;
}

/** Validation runs async even for sync rules - a macrotask lets it settle. */
const settle = () => wait();

describe('SubformsFieldModel', () => {
    describe('rows', () => {
        it('creates a FormModel per row, with subform initialValues as defaults', () => {
            const form = createForm({initialValues: {items: [{product: 'Apple'}]}}),
                [row] = getItems(form).value;

            expect(row).toBeInstanceOf(FormModel);
            expect(row.values.qty).toBe(1);
            expect(form.getData()).toEqual({items: [{product: 'Apple', qty: 1}]});
        });

        it('adds a row at the given index', () => {
            const form = createForm(),
                items = getItems(form);

            items.add({index: 0, initialValues: {product: 'Fig'}});
            expect(items.getData()).toEqual([
                {product: 'Fig', qty: 1},
                {product: 'Apple', qty: 2},
                {product: 'Pear', qty: 3}
            ]);
        });

        it('destroys rows once reset() can no longer restore them', () => {
            const form = createForm(),
                items = getItems(form),
                [apple] = items.value;

            items.add();
            const added = items.value[2];
            items.remove(added);
            items.remove(apple);
            expect(added.isDestroyed).toBe(true);
            expect(apple.isDestroyed).toBe(false);

            form.init({items: [{product: 'Fig'}]});
            expect(apple.isDestroyed).toBe(true);
        });
    });

    describe('isDirty', () => {
        it('is dirty when a value within a row changes', () => {
            const form = createForm(),
                [apple] = getItems(form).value;

            apple.setValues({qty: 5});
            expect(getItems(form).isDirty).toBe(true);
            expect(form.getData(true)).toEqual({
                items: [
                    {product: 'Apple', qty: 5},
                    {product: 'Pear', qty: 3}
                ]
            });
        });

        // Fixed in 47.1.1 (#2923) - changes to the list of rows did not reliably mark it dirty.
        it('is dirty when rows are added, removed or reordered', () => {
            const form = createForm(),
                items = getItems(form);

            items.add();
            expect(items.isDirty).toBe(true);
            items.remove(items.value[2]);
            expect(items.isDirty).toBe(false);

            items.remove(items.value[0]);
            expect(items.isDirty).toBe(true);
            form.reset();

            items.setValue([
                {product: 'Pear', qty: 3},
                {product: 'Apple', qty: 2}
            ]);
            expect(items.isDirty).toBe(true);
        });
    });

    describe('reset', () => {
        it('restores the original rows and their values', () => {
            const form = createForm(),
                items = getItems(form),
                [apple, pear] = items.value;

            apple.setValues({qty: 10});
            items.remove(pear);
            items.add({initialValues: {product: 'Fig'}});

            form.reset();
            expect(form.getData()).toEqual({
                items: [
                    {product: 'Apple', qty: 2},
                    {product: 'Pear', qty: 3}
                ]
            });
            expect(form.isDirty).toBe(false);
        });
    });

    describe('validation', () => {
        // Fixed in 81.0.2 (#4222) - reading allErrors threw for any form with a subforms field.
        it('fails the form for an invalid row, displaying and reporting its error', async () => {
            const form = createForm(),
                items = getItems(form);
            items.add();

            expect(await form.validateAsync()).toBe(false);
            expect(items.isNotValid).toBe(true);
            expect(form.allErrors).toEqual(['Product is required.']);
            expect(items.value[2].getField('product').validationDisplayed).toBe(true);

            items.value[2].setValues({product: 'Fig'});
            expect(await form.validateAsync()).toBe(true);
        });

        it('re-runs rules that read row values when a row changes', async () => {
            const form = createForm({
                    fields: [
                        {
                            name: 'items',
                            subforms: {fields: [{name: 'product'}, {name: 'qty'}]},
                            rules: [
                                (_, values) =>
                                    sumBy(values.items, 'qty') > 10 ? 'Total qty over 10.' : null
                            ]
                        }
                    ]
                }),
                items = getItems(form);
            await settle();
            expect(items.isValid).toBe(true);

            items.value[0].setValues({qty: 8});
            await settle();
            expect(items.errors).toEqual(['Total qty over 10.']);

            items.remove(items.value[1]);
            await settle();
            expect(items.isValid).toBe(true);
        });

        // BUG: SubformsFieldModel.ts:121 gathers each row field's `validationResults` rather than
        // its `allValidationResults`, so errors in nested subforms are missing from allErrors even
        // though the form is NotValid. Before 80.0.0 (862b97729), allErrors included them.
        it.fails('reports errors from nested subforms in allErrors', async () => {
            const form = createForm({
                fields: [
                    {
                        name: 'orders',
                        subforms: {
                            fields: [
                                {
                                    name: 'items',
                                    subforms: {fields: [{name: 'product', rules: [required]}]}
                                }
                            ]
                        }
                    }
                ],
                initialValues: {orders: [{items: [{product: null}]}]}
            });

            expect(await form.validateAsync()).toBe(false);
            expect(form.allErrors).toEqual(['Product is required.']);
        });
    });

    describe('disabled and readonly', () => {
        it('apply to existing and newly added rows', () => {
            const form = createForm(),
                items = getItems(form),
                [apple] = items.value;

            form.disabled = true;
            items.setReadonly(true);
            items.add();
            for (const row of items.value) {
                expect([row.disabled, row.readonly]).toEqual([true, true]);
            }
            expect(apple.getField('product').disabled).toBe(true);

            form.disabled = false;
            expect(apple.getField('product').disabled).toBe(false);
        });
    });
});
