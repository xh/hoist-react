/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {textInput} from '@xh/hoist/mobile/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The mobile TextInput renders a native `<input>` bound to a model. These guard how and when the
 * value reaches the model.
 */
describe('TextInput (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('renders the bound value in a text input', () => {
        const {input} = renderInput('hello');
        expect(input.tagName).toBe('INPUT');
        expect(input.type).toBe('text');
        expect(input.value).toBe('hello');
    });

    it('commits on blur, not on every keystroke', () => {
        const {input, model} = renderInput('a');
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: 'abc'}});
        expect(model.value).toBe('a');
        fireEvent.blur(input);
        expect(model.value).toBe('abc');
    });

    it('commits on Enter', () => {
        const {input, model} = renderInput('a');
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: 'abc'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe('abc');
    });

    it('commits a cleared or whitespace-only entry as null', () => {
        const {input, model} = renderInput('a');
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: '   '}});
        fireEvent.blur(input);
        expect(model.value).toBeNull();
    });

    it('clears and commits via the clear button', () => {
        const onCommit = vi.fn(),
            {model} = renderInput('abc', {enableClear: true, onCommit});
        fireEvent.click(screen.getByTestId('name-clear-btn'));
        expect(model.value).toBeNull();
        expect(onCommit).toHaveBeenCalledWith(null, 'abc');
    });

    it('hides the clear button when empty or disabled', () => {
        renderInput(null, {enableClear: true});
        expect(screen.queryByTestId('name-clear-btn')).toBeNull();
        renderInput('abc', {enableClear: true, disabled: true, testId: 'other'});
        expect(screen.queryByTestId('other-clear-btn')).toBeNull();
    });

    it('applies domAttrs to the input itself', () => {
        const {input} = renderInput('a', {domAttrs: {'aria-label': 'Name'}});
        expect(input.getAttribute('aria-label')).toBe('Name');
    });
});

//------------------
// Helpers
//------------------
class FormModel extends HoistModel {
    @bindable accessor value: string;

    constructor(value: string) {
        super();
        this.value = value;
    }
}

function renderInput(value: string, props: any = {}) {
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    render(textInput({model, bind: 'value', testId: 'name', ...props}));
    const input = screen.getByTestId(props.testId ?? 'name') as HTMLInputElement;
    return {input, model};
}
