/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ButtonGroupProps as BpButtonGroupProps} from '@blueprintjs/core';
import {
    hoistCmp,
    HoistModel,
    HoistProps,
    LayoutProps,
    StyleProps,
    TestSupportProps
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {buttonGroup as bpButtonGroup} from '@xh/hoist/kit/blueprint';
import {TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {SetOptional} from 'type-fest';

export interface ButtonGroupProps<M extends HoistModel = null>
    extends
        HoistProps<M>,
        LayoutProps,
        StyleProps,
        TestSupportProps,
        SetOptional<Omit<BpButtonGroupProps, 'ref'>, 'children'> {
    /** True to have all buttons fill available width equally. */
    fill?: boolean;

    /** True to render each button with minimal surrounding chrome (default false). */
    minimal?: boolean;

    /** True to render in a vertical orientation. */
    vertical?: boolean;
}

/**
 * Wrapper around Blueprint's ButtonGroup component, with LayoutSupport.
 */
export const [ButtonGroup, buttonGroup] = hoistCmp.withFactory<ButtonGroupProps>({
    displayName: 'ButtonGroup',
    model: false,
    className: 'xh-button-group',

    render(props, ref) {
        const [layoutProps, {fill, minimal, vertical, style, testId, ...rest}] =
            splitLayoutProps(props);
        return bpButtonGroup({
            fill,
            minimal,
            vertical,
            [TEST_ID]: testId,
            style: {
                ...style,
                ...layoutProps
            },
            ref,
            ...(rest as BpButtonGroupProps)
        });
    }
});
