/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistComponent, elemFactory, useLayoutProps} from '@xh/hoist/core';
import {buttonGroup as bpButtonGroup} from '@xh/hoist/kit/blueprint';
import {getClassName} from '@xh/hoist/utils/react';

import './ButtonGroup.scss';

/**
 * Wrapper around Blueprint's ButtonGroup component, with LayoutSupport.
 */
export const ButtonGroup = hoistComponent({
    displayName: 'ButtonGroup',
    render(props) {
        const [layoutProps, nonLayoutProps] = useLayoutProps(props),
            {fill, minimal, vertical, style, ...rest} = nonLayoutProps;
        return bpButtonGroup({
            fill,
            minimal,
            vertical,
            style: {
                ...style,
                ...layoutProps
            },
            ...rest,
            className: getClassName('xh-button-group', props)
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

export const buttonGroup = elemFactory(ButtonGroup);
