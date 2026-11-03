/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {checkbox} from '@xh/hoist/mobile/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * The mobile Checkbox renders a native checkbox that commits on every change.
 */
describe('Checkbox (mobile)', () => {
    beforeAll(() => initTestAppAsync({isMobileApp: true}));

    it('renders a native checkbox reflecting the bound value', () => {
        const {input} = renderInput(true);
        expect(input.type).toBe('checkbox');
        expect(input.checked).toBe(true);
    });

    it('commits a toggle immediately', () => {
        const {input, model} = renderInput(false);
        fireEvent.click(input);
        expect(model.value).toBe(true);
        fireEvent.click(input);
        expect(model.value).toBe(false);
    });

    it('disables the native input when disabled', () => {
        const {input} = renderInput(false, {disabled: true});
        expect(input.disabled).toBe(true);
    });
});

//------------------
// Helpers
//------------------
class FormModel extends HoistModel {
    @bindable accessor value: boolean;

    constructor(value: boolean) {
        super();
        this.value = value;
    }
}

function renderInput(value: boolean, props: any = {}) {
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    render(checkbox({model, bind: 'value', testId: 'cb', ...props}));
    const input = screen.getByTestId('cb') as HTMLInputElement;
    return {input, model};
}
