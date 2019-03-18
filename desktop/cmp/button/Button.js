/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {hoistComponent, useLayoutProps, useClassName} from '@xh/hoist/core';
import {button as bpButton} from '@xh/hoist/kit/blueprint';

/**
 * Wrapper around Blueprint's Button component. Defaults to the `minimal` style for reduced chrome
 * and adds layout support for top-level sizing and margin/padding props.
 *
 * Relays all other props supported by Blueprint's button.
 */
export const [Button, button] = hoistComponent(props => {
    const [layoutProps, nonLayoutProps] = useLayoutProps(props),
        {icon, text, onClick, minimal = true, style, ...rest} = nonLayoutProps;
    return bpButton({
        icon,
        minimal,
        onClick,
        text,
        style: {
            ...style,
            ...layoutProps
        },
        ...rest,
        className: useClassName('xh-button', props, minimal ? 'xh-button--minimal' : '')
    });
});

Button.propTypes = {
    icon: PT.element,
    minimal: PT.bool,
    onClick: PT.func,
    style: PT.object,
    text: PT.string,
    title: PT.string
};