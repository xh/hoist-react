/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';

import {box} from './Box';

/**
 * A container for the top level of the application.
 * Will stretch to encompass the entire browser.
 */
@HoistComponent()
@LayoutSupport
export class Viewport extends Component {
    baseCls = 'xh-viewport';
    render() {
        return box({
            top: 0,
            left: 0,
            position: 'fixed',
            width: '100%',
            height: '100%',
            cls: this.getClassNames(),
            ...this.props
        });
    }
}
export const viewport = elemFactory(Viewport);
