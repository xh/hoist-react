/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {checkbox, radioInput, switchInput} from '@xh/hoist/desktop/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * How the desktop Checkbox, SwitchInput and RadioInput render and commit values. Forms, grid
 * filters and admin panels bind to them.
 */
describe('Checkbox, SwitchInput and RadioInput (desktop)', () => {
    beforeAll(() => initTestAppAsync());

    it('renders a checkbox as a native input in a label, with Blueprint class names', () => {
        const {input} = renderBound(checkbox, true, {label: 'Active'});
        const label = input.closest('label');
        expect(input.type).toBe('checkbox');
        expect(input.checked).toBe(true);
        ['xh-check-box', 'xh-control', 'xh-control--checkbox', 'xh-control--inline'].forEach(cls =>
            expect(label.classList).toContain(cls)
        );
        expect(label.querySelector('.xh-control__indicator')).not.toBeNull();
        expect(label.textContent).toBe('Active');
    });

    it('commits a checkbox toggle', () => {
        const {input, model} = renderBound(checkbox, false);
        fireEvent.click(input);
        expect(model.value).toBe(true);
    });

    it('shows an unset checkbox as indeterminate when displayUnsetState is set', () => {
        const {input} = renderBound(checkbox, null, {displayUnsetState: true});
        expect(input.indeterminate).toBe(true);
    });

    it('puts the indicator after the label when labelSide is left', () => {
        const {input} = renderBound(checkbox, false, {labelSide: 'left'});
        expect(input.closest('label').classList).toContain('xh-control--align-right');
    });

    it('disables the native input and marks the label disabled', () => {
        const {input} = renderBound(switchInput, false, {disabled: true});
        expect(input.disabled).toBe(true);
        expect(input.closest('label').classList).toContain('xh-control--disabled');
    });

    it('renders a switch as a checkbox input with switch class names, and commits toggles', () => {
        const {input, model} = renderBound(switchInput, false);
        expect(input.type).toBe('checkbox');
        expect(input.closest('label').classList).toContain('xh-control--switch');
        fireEvent.click(input);
        expect(model.value).toBe(true);
    });

    it('renders radio options in a radiogroup sharing one name, and commits a choice', () => {
        const model = boundModel('b');
        render(
            radioInput({
                model,
                bind: 'value',
                testId: 'radios',
                options: ['a', 'b', {value: 'c', label: 'C', disabled: true}]
            })
        );
        const group = screen.getByTestId('radios'),
            [a, b, c] = Array.from(group.querySelectorAll('input'));
        expect(group.getAttribute('role')).toBe('radiogroup');
        expect(group.classList).toContain('xh-radio-input');
        expect(new Set([a.name, b.name, c.name]).size).toBe(1);
        expect(b.checked).toBe(true);
        expect(c.disabled).toBe(true);
        expect(screen.getByTestId('radios-a')).toBe(a);

        fireEvent.click(a);
        expect(model.value).toBe('a');
    });
});

//------------------
// Helpers
//------------------
class FormModel extends HoistModel {
    @bindable accessor value: any;

    constructor(value: any) {
        super();
        this.value = value;
    }
}

function boundModel(value: any) {
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    return model;
}

function renderBound(factory, value: any, props: any = {}) {
    const model = boundModel(value);
    render(factory({model, bind: 'value', testId: 'input', ...props}));
    const input = screen.getByTestId('input') as HTMLInputElement;
    return {input, model};
}
