/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type FormConfig, FormModel} from '@xh/hoist/cmp/form';
import {required} from '@xh/hoist/data';
import {wait} from '@xh/hoist/promise';
import {describe, expect, it, onTestFinished} from 'vitest';

/**
 * Field validation - the rules engine behind every Hoist form. Rules run reactively whenever the
 * values they read change, can be switched on and off by `when`, and can run async. Apps gate
 * saves on the result, so a slip here either blocks valid input or lets invalid data through.
 */

function createForm(config: FormConfig): FormModel {
    const ret = new FormModel(config);
    onTestFinished(() => ret.destroy());
    return ret;
}

/** Validation runs async even for sync rules - a macrotask lets it settle. */
const settle = () => wait();

describe('FieldModel', () => {
    describe('validation', () => {
        it('is Unknown until rules run, then tracks the current value', async () => {
            const form = createForm({fields: [{name: 'name', rules: [required]}]}),
                name = form.getField('name');

            expect(name.validationState).toBe('Unknown');
            expect(form.isValid).toBe(false);

            await settle();
            expect(name.isNotValid).toBe(true);
            expect(name.errors).toEqual(['Name is required.']);

            name.setValue('Jane');
            await settle();
            expect(name.isValid).toBe(true);
            expect(name.errors).toEqual([]);
        });

        // Added in 80.0.0 (#4194) - non-blocking results must not prevent a save.
        it('reports warning and info results without invalidating the field', async () => {
            const form = createForm({
                    fields: [
                        {
                            name: 'region',
                            initialValue: 'London',
                            rules: [
                                ({value}) =>
                                    value === 'London'
                                        ? {severity: 'warning', message: 'Outside core region.'}
                                        : null,
                                () => ({severity: 'info', message: 'Regions sync nightly.'})
                            ]
                        }
                    ]
                }),
                region = form.getField('region');
            await settle();

            expect(region.validationResults.map(it => it.severity)).toEqual(['warning', 'info']);
            expect(region.errors).toEqual([]);
            expect(region.isValid).toBe(true);
            expect(form.isValid).toBe(true);
            expect(form.allErrors).toEqual([]);
        });

        it('re-validates when another field read by a rule changes', async () => {
            const form = createForm({
                    fields: [
                        {name: 'password', initialValue: 'secret'},
                        {
                            name: 'confirm',
                            initialValue: 'secret',
                            rules: [
                                ({value}, values) =>
                                    value !== values.password ? 'Passwords must match.' : null
                            ]
                        }
                    ]
                }),
                confirm = form.getField('confirm');
            await settle();
            expect(confirm.isValid).toBe(true);

            form.setValues({password: 'changed'});
            await settle();
            expect(confirm.errors).toEqual(['Passwords must match.']);
        });

        it('applies a rule with a `when` condition only while the condition holds', async () => {
            const form = createForm({
                    fields: [
                        {
                            name: 'reason',
                            disabled: true,
                            rules: [{when: field => !field.disabled, check: required}]
                        }
                    ]
                }),
                reason = form.getField('reason');
            await settle();
            expect(reason.isRequired).toBe(false);
            expect(reason.isValid).toBe(true);

            reason.setDisabled(false);
            await settle();
            expect(reason.isRequired).toBe(true);
            expect(reason.isNotValid).toBe(true);
        });

        it('keeps the latest result when async results arrive out of order', async () => {
            // Each check stays pending until the test resolves it, keyed by the value checked.
            const checks = new Map<string, (error: string) => void>();
            const form = createForm({
                    fields: [
                        {
                            name: 'code',
                            rules: [
                                ({value}) =>
                                    new Promise<string>(resolve => checks.set(value, resolve))
                            ]
                        }
                    ]
                }),
                code = form.getField('code');

            code.setValue('taken');
            code.setValue('free');
            expect(code.isValidationPending).toBe(true);

            // Checks for the initial and current values pass, then the stale check fails late.
            checks.get(null)(null);
            checks.get('free')(null);
            checks.get('taken')('Code is already taken.');
            await settle();

            expect(code.isValidationPending).toBe(false);
            expect(code.errors).toEqual([]);
            expect(code.isValid).toBe(true);
        });

        it('re-validates after reset(), even when the value is unchanged', async () => {
            // reset() clears results to Unknown, and an unchanged value does not re-trigger the
            // rules on its own. Without a forced re-run, the form would never be valid again.
            const form = createForm({
                    fields: [{name: 'name', initialValue: 'Jane', rules: [required]}]
                }),
                name = form.getField('name');
            await settle();
            expect(name.isValid).toBe(true);

            form.reset();
            expect(name.validationState).toBe('Unknown');

            await settle();
            expect(form.isValid).toBe(true);
        });
    });

    describe('validationDisplayed', () => {
        it('turns on once the value changes, and off again on reset()', () => {
            const form = createForm({fields: [{name: 'name', rules: [required]}]}),
                name = form.getField('name');
            expect(name.validationDisplayed).toBe(false);

            name.setValue('Jane');
            expect(name.validationDisplayed).toBe(true);

            name.reset();
            expect(name.validationDisplayed).toBe(false);
        });
    });
});
