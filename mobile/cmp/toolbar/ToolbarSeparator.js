/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp} from '@xh/hoist/core';
import {span} from '@xh/hoist/cmp/layout';

import './Toolbar.scss';

/**
 * Convenience component to insert a pre-styled separator | between Toolbar items.
 */
export const [ToolbarSeparator, toolbarSeparator] = hoistCmp.withFactory({
    displayName: 'ToolbarSeparator',
    className: 'xh-toolbar__separator',
    model: false, memo: false, observer: false,


    render({className, ...props}) {
        return span({className, ...props});
    }
});

export const [ToolbarSep, toolbarSep] = [ToolbarSeparator, toolbarSeparator];
