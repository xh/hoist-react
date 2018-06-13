/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {elemFactory} from '@xh/hoist/core';
import {navbarDivider} from '@xh/hoist/kit/blueprint';

/**
 * Convenience component for adding a separator between AppBar items.
 */
export class AppBarSeparator extends Component {
    render() {
        return navbarDivider();
    }
}

export const appBarSeparator = elemFactory(AppBarSeparator);