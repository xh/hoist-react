/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {toolbarSeparator} from '@xh/hoist/desktop/cmp/toolbar';
import {apiDeprecated} from '@xh/hoist/utils/js';

/**
 * A separator between AppBar items.
 * @deprecated - use `'-'` in `AppBarProps.leftItems` or `rightItems`, or `toolbarSep`. Will be
 *      removed in v94.
 */
export const [AppBarSeparator, appBarSeparator] = hoistCmp.withFactory({
    displayName: 'AppBarSeparator',
    model: false,
    observer: false,

    render(props, ref) {
        apiDeprecated('appBarSeparator', {
            v: 'v94',
            msg: "Use '-' in AppBar items, or toolbarSep, instead.",
            source: 'AppBarSeparator'
        });
        return toolbarSeparator({ref, ...props});
    }
});
