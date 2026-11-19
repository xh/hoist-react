/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {SegmentedControl, segmentedControl} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render, screen} from '@testing-library/react';
import {afterEach, beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * How the desktop SegmentedControl shows and selects its options. Each test runs against Hoist's
 * own segments and the Blueprint fallback, which should behave the same.
 */
describe.each([
    ['Hoist', false],
    ['Blueprint', true]
])('SegmentedControl (desktop, %s)', (_name, useBlueprint) => {
    beforeAll(() => initTestAppAsync());

    afterEach(() => {
        SegmentedControl.defaults.useBlueprint = false;
    });

    const options = ['day', 'week', {value: 'month', label: 'Month', disabled: true}];

    it('renders a radio group of buttons, with only the selected one pressed in', () => {
        renderBound('week', {options}, useBlueprint);
        const radios = screen.getAllByRole('radio');
        expect(radios.map(it => it.textContent)).toEqual(['day', 'week', 'Month']);
        expect(radios.map(it => it.getAttribute('aria-checked'))).toEqual([
            'false',
            'true',
            'false'
        ]);
        expect(radios.map(it => it.classList.contains('bp6-minimal'))).toEqual([true, false, true]);
        expect(radios.map(it => it.tabIndex)).toEqual([-1, 0, -1]);
        expect((radios[2] as HTMLButtonElement).disabled).toBe(true);
        expect(screen.getByRole('radiogroup').classList).toContain('bp6-segmented-control');
    });

    it('selects an option on click', () => {
        const {model} = renderBound('week', {options}, useBlueprint);
        fireEvent.click(screen.getByText('day'));
        expect(model.value).toBe('day');
    });

    it('moves the selection with the arrow keys, skipping disabled options and wrapping', () => {
        const {model} = renderBound('week', {options}, useBlueprint);
        const week = screen.getByText('week').closest('button');
        week.focus();
        fireEvent.keyDown(week, {key: 'ArrowRight'});
        expect(model.value).toBe('day');
        expect(document.activeElement).toBe(screen.getByText('day').closest('button'));
    });

    it('makes the first option tabbable when nothing is selected', () => {
        renderBound(null, {options}, useBlueprint);
        expect(screen.getAllByRole('radio').map(it => it.tabIndex)).toEqual([0, -1, -1]);
    });

    it('renders an icon-only option without a text element', () => {
        renderBound(null, {options: [{value: 'a', icon: Icon.add()}]}, useBlueprint);
        const radio = screen.getByRole('radio');
        expect(radio.querySelector('svg')).not.toBeNull();
        expect(radio.querySelector('.bp6-button-text')).toBeNull();
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

function renderBound(value: string, props: any, useBlueprint: boolean) {
    SegmentedControl.defaults.useBlueprint = useBlueprint;
    const model = new FormModel(value);
    onTestFinished(() => model.destroy());
    render(segmentedControl({model, bind: 'value', ...props}));
    return {model};
}
