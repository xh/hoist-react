/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {separator} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import './Toolbar.scss';

/**
 * A separator between the items of a Toolbar or AppBar - a shared `Separator`, which the bar
 * sizes and colors. A `'-'` in a Toolbar's or AppBar's items renders one too.
 */
export const [ToolbarSeparator, toolbarSeparator] = hoistCmp.withFactory({
    displayName: 'ToolbarSeparator',
    model: false,
    observer: false,

    render(props, ref) {
        return separator({ref, vertical: true, ...props});
    }
});

/**
 * Abbreviated alias for ToolbarSeparator
 */
export const [ToolbarSep, toolbarSep] = [ToolbarSeparator, toolbarSeparator];
