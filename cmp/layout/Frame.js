/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';

import './Layout.scss';
import {box} from './Box';

/**
 * {@see Box} classes that flex to grow and stretch within its *own* parent via `flex:'auto'`.
 * Useful for creating space-filling nested layouts. VFrame and HFrame variants support internal
 * vertical (column) and horizontal (row) flex layouts.
 */
@HoistComponent
@LayoutSupport
export class VFrame extends Component {
    baseClassName = 'xh-vframe';
    render() {
        return box({
            ...this.props,
            className: this.getClassName()
        });
    }
}

@HoistComponent
@LayoutSupport
export class HFrame extends Component {
    baseClassName = 'xh-hframe';
    render() {
        return box({
            ...this.props,
            className: this.getClassName()
        });
    }
}

export const vframe = elemFactory(VFrame);
export const hframe = elemFactory(HFrame);