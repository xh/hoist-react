/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {FieldModel} from '@xh/hoist/cmp/form';
import {form, FormModel} from '@xh/hoist/cmp/form';
import {htmlButton, span} from '@xh/hoist/cmp/layout';
import type {FormFieldProps} from '@xh/hoist/desktop/cmp/form';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, render} from '@testing-library/react';
import type {ReactElement} from 'react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * Apps put per-field buttons beside an input with `rightItems`, and swap or wrap the input with
 * `inputRenderer` - often for every field at once, through a form's `fieldDefaults`.
 */
describe('FormField', () => {
    beforeAll(() => initTestAppAsync());

    const reset = htmlButton({className: 'reset', children: 'Reset'});

    describe('rightItems', () => {
        it('follows the input in its row when inline', () => {
            const el = renderField({inline: true, rightItems: [reset]}),
                row = el.querySelector('.xh-form-field__inner > .xh-form-field__input-row');

            expect(row.children[0].matches('input, .xh-input')).toBe(true);
            expect(row.querySelector('.xh-form-field__right-items .reset')).not.toBeNull();
        });

        it('sits after the input, for the label row, when stacked', () => {
            const el = renderField({rightItems: [reset]});

            expect(el.classList).toContain('xh-form-field--right-items');
            expect(el.querySelector('.xh-form-field__input-row')).toBeNull();
            expect(el.lastElementChild.matches('.xh-form-field__right-items')).toBe(true);
            expect(el.lastElementChild.querySelector('.reset')).not.toBeNull();
        });

        it('takes a function of the field model, and keys the elements itself', () => {
            const error = vi.spyOn(console, 'error').mockImplementation(() => {}),
                rightItems = vi.fn((f: FieldModel) => [
                    span({className: 'a', children: f.name}),
                    span({className: 'b', children: f.name})
                ]),
                el = renderField({inline: true, rightItems});

            expect(rightItems).toHaveBeenCalledWith(expect.objectContaining({name: 'title'}));
            expect(el.querySelectorAll('.xh-form-field__right-items span')).toHaveLength(2);
            expect(error.mock.calls.flat().join()).not.toMatch(/unique "key"/);
            error.mockRestore();
        });

        it('render only while the field is not readonly', () => {
            const {el, formModel} = renderForm({rightItems: [reset]});
            expect(el.querySelector('.reset')).not.toBeNull();

            act(() => (formModel.readonly = true));
            expect(el.querySelector('.reset')).toBeNull();
            expect(el.classList).not.toContain('xh-form-field--right-items');
        });

        it('come from fieldDefaults, and a field turns them off with null', () => {
            const {container} = renderForms(
                {rightItems: [reset]},
                formField({field: 'title', children: textInput()}),
                formField({field: 'size', rightItems: null, children: textInput()})
            );

            expect(container.querySelectorAll('.reset')).toHaveLength(1);
        });
    });

    describe('rightItemsWidth', () => {
        it('reserves its width on an inline field, with or without items', () => {
            const without = renderField({inline: true, rightItemsWidth: 48}),
                items = without.querySelector<HTMLElement>(
                    '.xh-form-field__input-row > .xh-form-field__right-items'
                );

            expect(items.style.width).toBe('48px');
            expect(items.children).toHaveLength(0);
        });

        it('keeps the width reserved while readonly', () => {
            const {el, formModel} = renderForm({
                inline: true,
                rightItems: [reset],
                rightItemsWidth: 48
            });

            act(() => (formModel.readonly = true));
            expect(el.querySelector<HTMLElement>('.xh-form-field__right-items').style.width).toBe(
                '48px'
            );
        });

        it('is ignored when stacked', () => {
            const el = renderField({rightItemsWidth: 48});

            expect(el.querySelector('.xh-form-field__right-items')).toBeNull();
            expect(el.querySelector('.xh-form-field__input-row')).toBeNull();
        });
    });

    describe('inputRenderer', () => {
        it('gets the bound input, with the id the label points at', () => {
            let received: ReactElement;
            const el = renderField({
                inputRenderer: (input: ReactElement, f: FieldModel) => {
                    received = input;
                    return span({className: 'wrapped', children: [f.name, input]});
                }
            });

            expect(received.props).toMatchObject({bind: 'value', id: expect.any(String)});
            expect(el.querySelector('label').htmlFor).toBe(received.props['id']);
            expect(el.querySelector('.wrapped input').id).toBe(received.props['id']);
        });

        it('replaces the input with what it returns', () => {
            const el = renderField({inputRenderer: () => span({className: 'chip', children: 'x'})});

            expect(el.querySelector('input')).toBeNull();
            expect(el.querySelector('.xh-form-field__inner > .chip')).not.toBeNull();
        });

        it('is not called while the field is readonly', () => {
            const inputRenderer = vi.fn(input => input),
                {formModel} = renderForm({inputRenderer});

            inputRenderer.mockClear();
            act(() => (formModel.readonly = true));
            expect(inputRenderer).not.toHaveBeenCalled();
        });
    });
});

function renderField(props: Partial<FormFieldProps>): HTMLElement {
    return renderForm(props).el;
}

function renderForm(props: Partial<FormFieldProps>) {
    const {container, formModel} = renderForms(
        {},
        formField({field: 'title', ...props, children: textInput()})
    );
    return {el: container.querySelector<HTMLElement>('.xh-form-field'), formModel};
}

function renderForms(fieldDefaults: Partial<FormFieldProps>, ...children: ReactElement[]) {
    const formModel = new FormModel({fields: [{name: 'title'}, {name: 'size'}]});
    onTestFinished(() => formModel.destroy());
    const {container} = render(form({model: formModel, fieldDefaults, children}));
    return {container, formModel};
}
