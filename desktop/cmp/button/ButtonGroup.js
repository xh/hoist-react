/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {buttonGroup as bpButtonGroup} from '@xh/hoist/kit/blueprint';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import PT from 'prop-types';

/**
 * Wrapper around Blueprint's ButtonGroup component, with LayoutSupport.
 */
export const [ButtonGroup, buttonGroup] = hoistCmp.withFactory({
    displayName: 'ButtonGroup',
    model: false,
    className: 'xh-button-group',

    render(props, ref) {
        const [layoutProps, {fill, minimal, vertical, style, ...rest}] = splitLayoutProps(props);

        return bpButtonGroup({
            fill,
            minimal,
            vertical,
            style: {
                ...style,
                ...layoutProps
            },
            ref,
            ...rest
        });
    }
});
ButtonGroup.propTypes = {
    /** True to have all buttons fill available width equally. */
    fill: PT.bool,

    /** True to render each button with minimal surrounding chrome (default false). */
    minimal: PT.bool,

    /** Style block. */
    style: PT.object,

    /** True to render in a vertical orientation. */
    vertical: PT.bool
};
