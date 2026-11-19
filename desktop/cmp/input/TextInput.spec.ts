/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * How the desktop TextInput and TextArea render and commit values. Forms, filters and dialogs
 * across desktop bind to them.
 */
describe('TextInput and TextArea (desktop)', () => {
    beforeAll(() => initTestAppAsync());

    it('renders a native text input in a Blueprint-styled input group', () => {
        const {input} = renderBound(textInput, 'Hello', {placeholder: 'Name'});
        expect(input.tagName).toBe('INPUT');
        expect(input.type).toBe('text');
        expect(input.value).toBe('Hello');
        expect(input.placeholder).toBe('Name');
        expect(input.classList).toContain('bp6-input');
        expect(input.parentElement.classList).toContain('bp6-input-group');
        expect(input.closest('.xh-text-input')).not.toBeNull();
    });

    it('commits typed text on Enter, and an empty value as null', () => {
        const {input, model} = renderBound(textInput, 'a');
        fireEvent.change(input, {target: {value: 'abc'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe('abc');

        fireEvent.change(input, {target: {value: ''}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBeNull();
    });

    it('shows a left icon, and a clear button that clears the value', () => {
        const {input, model} = renderBound(textInput, 'abc', {
            leftIcon: Icon.search(),
            enableClear: true
        });
        const group = input.parentElement;
        expect(group.firstElementChild.tagName).toBe('svg');

        fireEvent.click(screen.getByTestId('input-clear-btn'));
        expect(model.value).toBeNull();
    });

    it('marks the group disabled with the input', () => {
        const {input} = renderBound(textInput, 'a', {disabled: true});
        expect(input.disabled).toBe(true);
        expect(input.parentElement.classList).toContain('bp6-disabled');
    });

    it('renders a native textarea with Blueprint class names, committing on Enter', () => {
        const {input, model} = renderBound(textArea, 'one');
        expect(input.tagName).toBe('TEXTAREA');
        expect(input.classList).toContain('bp6-text-area');
        expect(input.classList).toContain('xh-text-area');

        fireEvent.change(input, {target: {value: 'two'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe('two');
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

function renderBound(factory, value: string, props: any = {}) {
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    render(factory({model, bind: 'value', testId: 'input', ...props}));
    const input = screen.getByTestId('input') as HTMLInputElement;
    return {input, model};
}
