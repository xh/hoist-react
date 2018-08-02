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
 */
@HoistComponent()
export class Button extends Component {

    static propTypes = {
        icon: PT.element,
        text: PT.string,
        onClick: PT.func
    };

    baseCls = 'xh-button';

    render() {
        const {icon, text, onClick, ...rest} = this.props;
        return bpButton({
            icon: icon,
            text: text,
            onClick: onClick,
            cls: this.classNames,
            ...rest
        });
    }

}
export const button = elemFactory(Button);