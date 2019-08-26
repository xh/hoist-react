/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistComponent, elemFactory} from '@xh/hoist/core';
import {navbarDivider} from '@xh/hoist/kit/blueprint';

/**
 * Convenience component for adding a separator between AppBar items.
 */
export const AppBarSeparator = hoistComponent({
    displayName: 'AppBarSeparator',

    render() {
        return navbarDivider();
    }
});
export const appBarSeparator = elemFactory(AppBarSeparator);