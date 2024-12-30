/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {span} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import './Toolbar.scss';

/**
 * Convenience component to insert a pre-styled separator | between Toolbar items.
 */
export const [ToolbarSeparator, toolbarSeparator] = hoistCmp.withFactory({
    displayName: 'ToolbarSeparator',
    model: false,
    observer: false,
    className: 'xh-toolbar__separator',

    render(props) {
        return span(props);
    }
});

/**
 * Abbreviated alias for ToolbarSeparator
 */
export const [ToolbarSep, toolbarSep] = [ToolbarSeparator, toolbarSeparator];
