/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {FieldModel} from '@xh/hoist/cmp/form';
import {form, FormModel} from '@xh/hoist/cmp/form';
import {htmlButton, span} from '@xh/hoist/cmp/layout';
import type {FormFieldProps} from '@xh/hoist/mobile/cmp/form';
import {formField} from '@xh/hoist/mobile/cmp/form';
import {textInput} from '@xh/hoist/mobile/cmp/input';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {act, render} from '@testing-library/react';
import type {ReactElement} from 'react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/** Mobile FormField takes desktop's `rightItems` and `inputRenderer`, always stacked. */
describe('mobile FormField', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    const reset = htmlButton({className: 'reset', children: 'Reset'});

    it('puts rightItems after the input, for the label row', () => {
        const {el} = renderField({rightItems: f => [reset, span(f.name)]});

        expect(el.classList).toContain('xh-form-field--right-items');
        expect(el.lastElementChild.matches('.xh-form-field__right-items')).toBe(true);
        expect(el.lastElementChild.children).toHaveLength(2);
    });

    it('shows rightItems only while the field is not readonly', () => {
        const {el, formModel} = renderField({rightItems: [reset]});

        act(() => (formModel.readonly = true));
        expect(el.querySelector('.reset')).toBeNull();
        expect(el.classList).not.toContain('xh-form-field--right-items');
    });

    it('passes the bound input to inputRenderer, and shows what it returns', () => {
        let received: ReactElement;
        const inputRenderer = vi.fn((input: ReactElement, f: FieldModel) => {
                received = input;
                return span({className: 'chip', children: f.name});
            }),
            {el, formModel} = renderField({inputRenderer});

        expect(received.props).toMatchObject({bind: 'value'});
        expect(el.querySelector('input')).toBeNull();
        expect(el.querySelector('.xh-form-field__inner > .chip').textContent).toBe('title');

        inputRenderer.mockClear();
        act(() => (formModel.readonly = true));
        expect(inputRenderer).not.toHaveBeenCalled();
    });
});

function renderField(props: Partial<FormFieldProps>) {
    const formModel = new FormModel({fields: [{name: 'title'}]});
    onTestFinished(() => formModel.destroy());
    const {container} = render(
        form({
            model: formModel,
            children: formField({field: 'title', ...props, children: textInput()})
        })
    );
    return {el: container.querySelector<HTMLElement>('.xh-form-field'), formModel};
}
