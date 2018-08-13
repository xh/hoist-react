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
    baseClassName = 'xh-spacer';
    render() {
        return box({
            ...this.props,
            flex: 'none',
            className: this.getClassName()
        });
    }
}

/**
 * A component that stretches to soak up space along the main axis of its parent container.
 */
@HoistComponent()
@LayoutSupport
export class Filler extends Component {
    baseClassName = 'xh-filler';
    render() {
        return box({
            ...this.props,
            flex: 'auto',
            className: this.getClassName()
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