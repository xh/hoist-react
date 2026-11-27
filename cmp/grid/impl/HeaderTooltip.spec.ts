/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {PlainObject} from '@xh/hoist/core';
import {render} from '@testing-library/react';
import type {ReactNode} from 'react';
import {createElement, useRef} from 'react';
import {describe, expect, it, vi} from 'vitest';
import {useDefaultHeaderTooltip} from './HeaderTooltip';

/**
 * The default tooltip for a column or group header with no tooltip of its own. It must show the
 * full name wherever the header hides it, and stay out of the way where the header already shows
 * it in full - a tooltip that only repeats the label teaches users to ignore them.
 */
describe('useDefaultHeaderTooltip', () => {
    it.each([
        ['a headerTooltip', {headerTooltip: 'Custom'}, false],
        ['a null headerTooltip', {headerTooltip: null}, false],
        ['an agOptions.headerTooltip', {agOptions: {headerTooltip: false}}, false],
        ['browser tooltips', {}, true]
    ])('leaves the tooltip to ag-Grid for %s', (_, owner, browserTooltips) => {
        const {setTooltip} = renderHeader({owner, browserTooltips, description: 'Desc'});
        expect(setTooltip).not.toHaveBeenCalled();
    });

    it('always shows a description, under the full name', () => {
        const {content, shouldDisplay} = renderHeader({
            label: 'Quantity',
            description: 'Shares held'
        });
        expect(content).toEqual({name: 'Quantity', description: 'Shares held'});
        expect(shouldDisplay()).toBe(true);
    });

    it.each([
        ['abbreviated', 'Qty'],
        ['an icon', createElement('svg')]
    ])('without a description, shows the full name when the label is %s', (_, label) => {
        const {content, shouldDisplay} = renderHeader({label});
        expect(content).toEqual({name: 'Quantity', description: null});
        expect(shouldDisplay()).toBe(true);
    });

    it('without a description, shows the full name when the label is truncated', () => {
        const {shouldDisplay, labelEl} = renderHeader({label: 'Quantity'});
        expect(shouldDisplay()).toBe(false);

        // jsdom has no layout - stub the overflow that the ellipsis comes from.
        Object.defineProperty(labelEl, 'offsetWidth', {value: 40});
        Object.defineProperty(labelEl, 'scrollWidth', {value: 80});
        expect(shouldDisplay()).toBe(true);
    });

    it.each([
        ['the full name', 'Quantity'],
        ['the full name, decorated', 'Quantity (USD)'],
        ['blank', null]
    ])('without a description, shows nothing when the label is %s', (_, label) => {
        expect(renderHeader({label}).shouldDisplay()).toBe(false);
    });

    it('sets the tooltip again when ag-Grid refreshes the header with a new setTooltip', () => {
        // ag-Grid drops a tooltip set through the setTooltip of the params it replaces.
        const {rerender} = renderHeader({label: 'Qty'}),
            newSetTooltip = vi.fn();
        rerender(newSetTooltip);
        expect(newSetTooltip).toHaveBeenCalledWith(
            {name: 'Quantity', description: null},
            expect.any(Function)
        );
    });
});

/** Render a header label under the hook, for a column whose full name is 'Quantity'. */
function renderHeader({
    label = null,
    owner = {},
    browserTooltips = false,
    description = null
}: {
    label?: ReactNode;
    owner?: {headerTooltip?: string; agOptions?: PlainObject};
    browserTooltips?: boolean;
    description?: string;
}) {
    const api = {getGridOption: () => browserTooltips} as any,
        ownerWithTooltip = {headerTooltip: undefined, ...owner};

    const Header = ({setTooltip}) => {
        const labelRef = useRef<HTMLSpanElement>(null);
        useDefaultHeaderTooltip({
            setTooltip,
            api,
            labelRef,
            owner: ownerWithTooltip,
            name: 'Quantity',
            description
        });
        return createElement('span', {ref: labelRef}, label);
    };

    const setTooltip = vi.fn(),
        result = render(createElement(Header, {setTooltip})),
        [content, shouldDisplay] = setTooltip.mock.lastCall ?? [];
    return {
        setTooltip,
        content,
        shouldDisplay,
        labelEl: result.container.firstElementChild,
        rerender: (fn: Function) => result.rerender(createElement(Header, {setTooltip: fn}))
    };
}
