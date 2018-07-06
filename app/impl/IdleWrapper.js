/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {XH, HoistComponent, elemFactory} from '@xh/hoist/core';

@HoistComponent()
class IdleWrapper extends Component {

    render() {
        const cmp = XH.idleComponent;
        if (!cmp) return null;

        return cmp;
    }
}

export const idleWrapper = elemFactory(IdleWrapper);