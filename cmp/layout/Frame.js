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
 * A Box class that flexes to grow and stretch within its *own* parent via flex:'auto', useful for
 * creating nested layouts.
 *
 * VFrame and HFrame variants support internal vertical (column) and horizontal (row) flex layouts.
 */
@HoistComponent()
@LayoutSupport
export class Frame extends Component {
    render() {
        return box({flex: 'auto', ...this.props});
    }
}

@HoistComponent()
@LayoutSupport
export class VFrame extends Component {
    baseCls = 'xh-vframe';
    render() {
        return box({
            flex: 'auto',
            flexDirection: 'column',
            ...this.props,
            className: this.getClassName()
        });
    }
}

@HoistComponent()
@LayoutSupport
export class HFrame extends Component {
    baseCls = 'xh-hframe';
    render() {
        return box({
            flex: 'auto',
            flexDirection: 'row',
            ...this.props,
            className: this.getClassName()
        });
    }
}

export const frame = elemFactory(Frame);
export const vframe = elemFactory(VFrame);
export const hframe = elemFactory(HFrame);