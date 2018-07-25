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
 * A component useful for inserting fixed spacing along the main axis of its
 * parent container.
 */
@HoistComponent()
@LayoutSupport
export class Spacer extends Component {
    render() {
        return box({flex: 'none', ...this.props});
    }
}

/**
 * A component useful for stretching to soak up space along the main axis of its
 * parent container.
 */
@HoistComponent()
@LayoutSupport
export class Filler extends Component {
    render() {
        return box({flex: 'auto', ...this.props});
    }
}

export const spacer = elemFactory(Spacer);
export const filler = elemFactory(Filler);

//--------------------------------
// Convenience Factories
//--------------------------------
export function hspacer(width)  {return spacer({width})}
export function vspacer(height) {return spacer({height})}