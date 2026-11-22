/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import type {SegmentedControlProps} from '@xh/hoist/desktop/cmp/input';
import {segmentedControl} from '@xh/hoist/desktop/cmp/input';
import {bindable} from '@xh/hoist/mobx';
import {initTestAppAsync} from '@xh/hoist/test-support';
import {fireEvent, render} from '@testing-library/react';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * A two-option SegmentedControl with `toggleOnClick` stands in for a switch on desktop - On / Off,
 * Show / Hide - so any click on it must flip the value, as a switch would.
 */
describe('SegmentedControl', () => {
    beforeAll(() => initTestAppAsync());

    describe('toggleOnClick', () => {
        it('flips the value when the selected segment is clicked', () => {
            const {model, el} = renderControl(true, {toggleOnClick: true});

            fireEvent.click(segment(el, 'On'));
            expect(model.value).toBe(false);
            fireEvent.click(segment(el, 'Off'));
            expect(model.value).toBe(true);
        });

        it('selects the clicked segment when it is not selected', () => {
            const {model, el} = renderControl(true, {toggleOnClick: true});

            fireEvent.click(segment(el, 'Off'));
            expect(model.value).toBe(false);
        });

        it('flips the value on a click on the tray between segments', () => {
            const {model, el} = renderControl(false, {toggleOnClick: true});

            fireEvent.click(el);
            expect(model.value).toBe(true);
        });

        it('selects the clicked segment when nothing is selected yet', () => {
            const {model, el} = renderControl(null, {toggleOnClick: true});

            fireEvent.click(segment(el, 'Off'));
            expect(model.value).toBe(false);
        });

        // jsdom doesn't turn Space or Enter into a click on a focused button, as browsers do, so
        // this checks what they rely on: the selected segment is the tab stop, and its click flips.
        it('keeps the selected segment as the only tab stop, for Space and Enter to flip', () => {
            const {model, el} = renderControl(true, {toggleOnClick: true}),
                stops = Array.from(el.querySelectorAll('button')).filter(b => b.tabIndex === 0);

            expect(stops).toEqual([segment(el, 'On')]);
            fireEvent.click(stops[0]);
            expect(model.value).toBe(false);
            expect(document.querySelector('button[tabindex="0"]')).toBe(segment(el, 'Off'));
        });

        it('does not toggle without the prop, with three options, or when disabled', () => {
            const plain = renderControl(true, {});
            fireEvent.click(segment(plain.el, 'On'));
            expect(plain.model.value).toBe(true);

            const three = renderControl('a', {
                toggleOnClick: true,
                options: ['a', 'b', 'c']
            });
            fireEvent.click(segment(three.el, 'a'));
            expect(three.model.value).toBe('a');

            const disabled = renderControl(true, {toggleOnClick: true, disabled: true});
            fireEvent.click(disabled.el);
            expect(disabled.model.value).toBe(true);
        });
    });
});

class ValueModel extends HoistModel {
    @bindable accessor value: any;
}

function renderControl(value: any, props: Partial<SegmentedControlProps>) {
    const model = new ValueModel();
    model.value = value;
    const el = render(
        segmentedControl({
            model,
            bind: 'value',
            options: [
                {value: true, label: 'On'},
                {value: false, label: 'Off'}
            ],
            ...props
        } as SegmentedControlProps)
    ).container.querySelector<HTMLElement>('.xh-segmented-control');
    return {model, el};
}

function segment(el: HTMLElement, label: string): HTMLElement {
    return Array.from(el.querySelectorAll('button')).find(b => b.textContent === label);
}
