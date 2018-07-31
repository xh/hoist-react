/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button as bpButton} from '@xh/hoist/kit/blueprint';

/**
 * Wrapper around Blueprint's Button component.
 * Hoist's most basic button accepts any props supported by Blueprint's Button.
 *
 * Must be provided an onClick handler.
 */
@HoistComponent()
export class Button extends Component {

    static propTypes = {
        // Support (Blueprint icon def) string for icon due to edge-case required within fields.
        // See https://github.com/exhi/hoist-react/issues/490.
        icon: PT.oneOfType([PT.element, PT.string]),
        text: PT.string,
        onClick: PT.func.isRequired
    };

    render() {
        const {icon, text, onClick, ...rest} = this.props;
        return bpButton({
            icon: icon,
            text: text,
            onClick: onClick,
            ...rest
        });
    }

}
export const button = elemFactory(Button);