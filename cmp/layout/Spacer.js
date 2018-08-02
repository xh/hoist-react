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
 * A component for inserting a fixed-sized spacer along the main axis of its parent container.
 * Convenience ElemFactories hspacer() and vspacer() each take a pixel size directly.
 */
@HoistComponent()
@LayoutSupport
export class Spacer extends Component {
    baseCls = 'xh-spacer';
    render() {
        return box({
            flex: 'none',
            cls: this.getClassNames(),
            ...this.props
        });
    }
}

/**
 * A component that stretches to soak up space along the main axis of its parent container.
 */
@HoistComponent()
@LayoutSupport
export class Filler extends Component {
    baseCls = 'xh-filler';
    render() {
        return box({
            flex: 'auto',
            cls: this.getClassNames(),
            ...this.props
        });
    }
}

export const spacer = elemFactory(Spacer);
export const filler = elemFactory(Filler);

//--------------------------------
// Convenience Factories
//--------------------------------
export function hspacer(width)  {return spacer({width})}
export function vspacer(height) {return spacer({height})}