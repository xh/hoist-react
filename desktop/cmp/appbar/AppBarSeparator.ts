/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {navbarDivider} from '@xh/hoist/kit/blueprint';

/**
 * Convenience component for adding a separator between AppBar items.
 */
export const [AppBarSeparator, appBarSeparator] = hoistCmp.withFactory({
    displayName: 'AppBarSeparator',

    render() {
        return navbarDivider();
    }
});
