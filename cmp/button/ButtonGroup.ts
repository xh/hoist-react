/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {
    ComponentSize,
    DomAttrsProps,
    HoistModel,
    HoistProps,
    Intent,
    LayoutProps,
    StyleProps,
    TestSupportProps
} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {omitBy, isNil} from 'lodash';
import type {HTMLAttributes} from 'react';
import {Children, cloneElement, createElement, isValidElement} from 'react';
import type {ButtonProps} from './Button';
import {Button} from './Button';
import './Button.scss';

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

    /** Intent for each button in the group, in place of its own. */
    intent?: Intent;

    /** True to render each button with minimal surrounding chrome. */
    minimal?: boolean;

    /** True to render each button with an outline. */
    outlined?: boolean;

    /** Size of each button in the group. */
    size?: ComponentSize;

    /** True to render in a vertical orientation. */
    vertical?: boolean;
}

/**
 * Joins adjacent buttons into a single control, with LayoutSupport. Relays any other native `<div>`
 * attributes and event handlers to the underlying element.
 *
 * The group's `intent`, `minimal` and `outlined`, when set, apply to each Button directly within
 * it, in place of the Button's own.
 */
export const [ButtonGroup, buttonGroup] = hoistCmp.withFactory<ButtonGroupProps>({
    displayName: 'ButtonGroup',
    model: false,
    className: 'xh-button-group',

    render(props, ref) {
        const [
            layoutProps,
            {
                children,
                className,
                fill,
                intent,
                minimal,
                outlined,
                size,
                vertical,
                style,
                testId,
                domAttrs,
                ...rest
            }
        ] = splitLayoutProps(props);

        const groupButtonProps = omitBy({intent, minimal, outlined}, isNil) as ButtonProps,
            buttons = Children.map(children, it =>
                isValidElement(it) && it.type === Button ? cloneElement(it, groupButtonProps) : it
            );

        return createElement('div', {
            role: 'group',
            [TEST_ID]: testId,
            ...domAttrs,
            style: {...style, ...layoutProps},
            ref,
            ...rest,
            className: classNames(
                {
                    'xh-button-group--fill': fill,
                    'xh-button-group--minimal': minimal,
                    'xh-button-group--outlined': outlined,
                    'xh-button-group--vertical': vertical
                },
                size && size !== 'standard' ? `xh-button-group--${size}` : null,
                className
            ),
            children: buttons
        });
    }
});
