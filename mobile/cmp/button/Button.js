/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {button as onsenButton} from '@xh/hoist/kit/onsen';

/**
 * Wrapper around Onsen's Button component.
 * Hoist's most basic button accepts any props supported by Onsen's Button.
 *
 * Must be provided an onClick handler.
 */
@HoistComponent()
export class Button extends Component {

    static propTypes = {
        icon: PT.element,
        text: PT.string,
        modifier: PT.string,
        onClick: PT.func
    };

    render() {
        const {icon, text, modifier, onClick, ...rest} = this.props;

        return onsenButton({
            items: [icon, text].filter(Boolean),
            modifier: modifier,
            onClick: onClick,
            ...rest
        });
    }

}
export const button = elemFactory(Button);