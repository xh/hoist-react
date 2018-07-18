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
 * A Box class that flexes to grow and stretch within its *own* parent.
 *
 * This class is useful for creating nested layouts.  See also VFrame, and HFrame.
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
    render() {
        return box({flex: 'auto', flexDirection: 'column', ...this.props});
    }
}

@HoistComponent()
@LayoutSupport
export class HFrame extends Component {
    render() {
        return box({flex: 'auto', flexDirection: 'row', ...this.props});
    }
}

export const frame = elemFactory(Frame);
export const vframe = elemFactory(VFrame);
export const hframe = elemFactory(HFrame);