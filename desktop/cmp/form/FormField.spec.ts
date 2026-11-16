/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {form, FormModel} from '@xh/hoist/cmp/form';
import {formField, type FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {render} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

describe('FormField', () => {
    beforeAll(() => initTestAppAsync());

    describe('labelSide', () => {
        it('places the label on top by default', () => {
            expect(labelSideOf({})).toBe('top');
        });

        it('places the label on top or to the left as set', () => {
            expect(labelSideOf({labelSide: 'top'})).toBe('top');
            expect(labelSideOf({labelSide: 'left'})).toBe('left');
        });

        it('defaults from the Form fieldDefaults', () => {
            expect(labelSideOf({}, {labelSide: 'left'})).toBe('left');
        });

        it('prefers the field prop over the Form fieldDefaults', () => {
            expect(labelSideOf({labelSide: 'top'}, {labelSide: 'left'})).toBe('top');
        });

        it('applies labelWidth and labelTextAlign to a left label', () => {
            const label = renderField({
                labelSide: 'left',
                labelWidth: 120,
                labelTextAlign: 'right'
            }).label;
            expect(label.style.width).toBe('120px');
            expect(label.style.textAlign).toBe('right');
        });
    });

    describe('deprecated inline', () => {
        it('maps true to a left label and false to a top label', () => {
            expect(labelSideOf({inline: true})).toBe('left');
            expect(labelSideOf({inline: false}, {labelSide: 'left'})).toBe('top');
        });

        it('maps from the Form fieldDefaults', () => {
            expect(labelSideOf({}, {inline: true})).toBe('left');
        });

        it('yields to labelSide when both are set', () => {
            expect(labelSideOf({labelSide: 'top', inline: true})).toBe('top');
            expect(labelSideOf({}, {labelSide: 'top', inline: true})).toBe('top');
        });
    });
});

//------------------
// Helpers
//------------------
function renderField(props: Partial<FormFieldProps>, fieldDefaults = {}) {
    const formModel = new FormModel({fields: [{name: 'name'}]});
    onTestFinished(() => formModel.destroy());

    const {container} = render(
        form({
            model: formModel,
            testId: 'f',
            fieldDefaults,
            item: formField({field: 'name', item: textInput(), ...props})
        })
    );
    const field = container.querySelector<HTMLElement>('[data-testid="f-name"]');
    return {field, label: field.querySelector<HTMLElement>('.xh-form-field__label')};
}

/** The side the rendered field places its label on, read from its inline class. */
function labelSideOf(props: Partial<FormFieldProps>, fieldDefaults = {}) {
    const {field} = renderField(props, fieldDefaults);
    return field.classList.contains('xh-form-field--inline') ? 'left' : 'top';
}
