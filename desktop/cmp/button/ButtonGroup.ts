/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    DomAttrsProps,
    HoistModel,
    HoistProps,
    LayoutProps,
    StyleProps,
    TestSupportProps
} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {buttonGroup as bpButtonGroup} from '@xh/hoist/kit/blueprint';
import {TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import type {HTMLAttributes} from 'react';
import {createElement} from 'react';
import {Button} from './Button';

export interface ButtonGroupProps<M extends HoistModel = null>
    extends
        HoistProps<M>,
        LayoutProps,
        StyleProps,
        TestSupportProps,
        DomAttrsProps,
        HTMLAttributes<HTMLDivElement> {
    /** True to have all buttons fill available width equally. */
    fill?: boolean;

    /** True to render each button with minimal surrounding chrome (default false). */
    minimal?: boolean;

    /** True to render each button with an outline (default false). */
    outlined?: boolean;

    /** True to render in a vertical orientation. */
    vertical?: boolean;
}

/**
 * Joins adjacent buttons into a single control, with LayoutSupport. Relays any other native `<div>`
 * attributes and event handlers to the underlying element.
 *
 * Renders with Blueprint's button group when `Button.defaults.useBlueprint` is set.
 */
export const [ButtonGroup, buttonGroup] = hoistCmp.withFactory<ButtonGroupProps>({
    displayName: 'ButtonGroup',
    model: false,
    className: 'xh-button-group',

    render(props, ref) {
        const [
            layoutProps,
            {className, fill, minimal, outlined, vertical, style, testId, domAttrs, ...rest}
        ] = splitLayoutProps(props);

        if (Button.defaults.useBlueprint) {
            return bpButtonGroup({
                className,
                fill,
                minimal,
                outlined,
                vertical,
                [TEST_ID]: testId,
                ...domAttrs,
                style: {...style, ...layoutProps},
                ref,
                ...rest
            });
        }

        // Blueprint's class names are kept, so its styles and any app CSS keyed to them still apply.
        return createElement('div', {
            [TEST_ID]: testId,
            ...domAttrs,
            style: {
                ...style,
                ...layoutProps
            },
            ref,
            ...rest,
            className: classNames(
                'bp6-button-group',
                {
                    'bp6-fill': fill,
                    'bp6-minimal': minimal,
                    'bp6-outlined': outlined,
                    'bp6-vertical': vertical
                },
                className
            )
        });
    }
});
