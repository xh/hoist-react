/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {hoistComponent, elemFactory} from 'hoist/core';
import {frame} from 'hoist/layout';
import {overlay} from 'hoist/kit/blueprint';

import './Mask.scss';

/**
 * Simple Mask for Disabled or Inactive components.
 */
@hoistComponent()
export class ComponentMask extends Component {

    BACKGROUND = 'rgba(0,0,0, 0.8)';

    static propTypes = {
        isDisplayed: PT.bool,
        displayText: PT.string
    };

    render() {
        const {isDisplayed, displayText} = this.props;
        if (!isDisplayed) return null;

        return overlay({
            cls: 'xh-mask',
            autoFocus: false,
            isOpen: true,
            canEscapeKeyClose: false,
            backdropProps: {
                style: {backgroundColor: this.BACKGROUND}
            },
            usePortal: false,
            item: frame({
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                style: {
                    textAlign: 'center'
                },
                items: displayText || null
            })
        });
    }
}
export const componentMask = elemFactory(ComponentMask);


