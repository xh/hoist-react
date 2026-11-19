/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {NumberInput, numberInput} from '@xh/hoist/desktop/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * How the desktop NumberInput edits, steps and commits numbers. Each test runs against Hoist's own
 * input and the Blueprint fallback, which should behave the same.
 */
describe.each([
    ['Hoist', false],
    ['Blueprint', true]
])('NumberInput (desktop, %s)', (_name, useBlueprint) => {
    beforeAll(() => initTestAppAsync());

    afterEach(() => {
        NumberInput.defaults.useBlueprint = false;
    });

    it('renders a text input with Blueprint class names', () => {
        const {input} = renderBound(null, {}, useBlueprint);
        expect(input.type).toBe('text');
        expect(input.classList).toContain('bp6-input');
        expect(input.closest('.bp6-numeric-input').classList).toContain('xh-number-input');
    });

    it('commits typed digits on Enter', () => {
        const {input, model} = renderBound(null, {}, useBlueprint);
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: '42.5'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe(42.5);
    });

    it('steps with the arrow keys - Shift for a major step, Alt for a minor one', () => {
        const {input, model} = renderBound(5, {precision: 2}, useBlueprint);
        fireEvent.focus(input);

        fireEvent.keyDown(input, {key: 'ArrowUp'});
        expect(input.value).toBe('6');
        fireEvent.keyDown(input, {key: 'ArrowUp', shiftKey: true});
        expect(input.value).toBe('16');
        fireEvent.keyDown(input, {key: 'ArrowDown', altKey: true});
        expect(input.value).toBe('15.99');

        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe(15.99);
    });

    it('keeps a stepped value within min and max', () => {
        const {input} = renderBound(9, {max: 10}, useBlueprint);
        fireEvent.focus(input);
        fireEvent.keyDown(input, {key: 'ArrowUp', shiftKey: true});
        expect(input.value).toBe('10');
    });

    it('blocks keys that cannot appear in a number, but not modified ones', () => {
        const {input} = renderBound(null, {}, useBlueprint);
        expect(isBlocked(input, {key: 'a'})).toBe(true);
        expect(isBlocked(input, {key: '7'})).toBe(false);
        expect(isBlocked(input, {key: 'a', ctrlKey: true})).toBe(false);
    });

    it('allows letters for shorthand units', () => {
        const {input, model} = renderBound(null, {enableShorthandUnits: true}, useBlueprint);
        expect(isBlocked(input, {key: 'k'})).toBe(false);
        fireEvent.focus(input);
        fireEvent.change(input, {target: {value: '2k'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe(2000);
    });

    it('strips non-numeric characters from pasted text', () => {
        const {input, model} = renderBound(null, {}, useBlueprint);
        fireEvent.focus(input);
        fireEvent.paste(input);
        fireEvent.change(input, {target: {value: '$1x23'}});
        fireEvent.keyDown(input, {key: 'Enter'});
        expect(model.value).toBe(123);
    });

    it('steps a value shown with commas while editing', () => {
        const {input} = renderBound(1234, {displayWithCommas: 'always'}, useBlueprint);
        fireEvent.focus(input);
        expect(input.value).toBe('1,234');
        fireEvent.keyDown(input, {key: 'ArrowUp'});
        expect(input.value).toBe('1,235');
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

function renderBound(value: number, props: any, useBlueprint: boolean) {
    NumberInput.defaults.useBlueprint = useBlueprint;
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    render(numberInput({model, bind: 'value', testId: 'input', ...props}));
    const input = screen.getByTestId('input') as HTMLInputElement;
    return {input, model};
}

// A typed key is blocked if its keydown or keypress has its default prevented.
function isBlocked(input: HTMLElement, init: {key: string; ctrlKey?: boolean}): boolean {
    const charCode = init.key.charCodeAt(0);
    return !fireEvent.keyDown(input, init) || !fireEvent.keyPress(input, {...init, charCode});
}
