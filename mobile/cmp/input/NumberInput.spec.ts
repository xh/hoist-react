/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {numberInput} from '@xh/hoist/mobile/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The mobile NumberInput renders a native text input with a numeric keyboard, and parses what the
 * user types on commit. These guard the parsing, formatting and range checks apps rely on.
 */
describe('NumberInput (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('renders a text input with a decimal keyboard', () => {
        const {input} = renderInput(5);
        expect(input.type).toBe('text');
        expect(input.getAttribute('inputmode')).toBe('decimal');
        expect(input.value).toBe('5');
    });

    it('commits the parsed number on blur, ignoring commas', () => {
        const {input, model} = renderInput(null);
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: '1,234.5'}});
        fireEvent.blur(input);
        expect(model.value).toBe(1234.5);
    });

    it('expands shorthand units when enabled', () => {
        const {input, model} = renderInput(null, {enableShorthandUnits: true});
        expect(input.getAttribute('inputmode')).toBe('text');
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: '2.5k'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe(2500);
    });

    it('rejects an entry outside min and max', () => {
        const {input, model} = renderInput(5, {min: 0, max: 10});
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: '11'}});
        fireEvent.blur(input);
        expect(model.value).toBe(5);
    });

    it('formats with commas when not focused, if displayWithCommas is set', () => {
        const {input} = renderInput(1234567, {displayWithCommas: true});
        expect(input.value).toBe('1,234,567');
    });
});

//------------------
// Helpers
//------------------
class FormModel extends HoistModel {
    @bindable accessor value: number;

    constructor(value: number) {
        super();
        this.value = value;
    }
}

function renderInput(value: number, props: any = {}) {
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    render(numberInput({model, bind: 'value', testId: 'qty', ...props}));
    const input = screen.getByTestId('qty') as HTMLInputElement;
    return {input, model};
}
