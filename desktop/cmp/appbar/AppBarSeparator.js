/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmpAndFactory} from '@xh/hoist/core';
import {navbarDivider} from '@xh/hoist/kit/blueprint';

/**
 * Convenience component for adding a separator between AppBar items.
 */
export const [AppBarSeparator, appBarSeparator] = hoistCmpAndFactory({
    displayName: 'AppBarSeparator',

    render() {
        return navbarDivider();
    }
});