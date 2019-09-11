/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmpAndFactory} from '@xh/hoist/core';
import {getClassName} from '@xh/hoist/utils/react';
import {span} from '@xh/hoist/cmp/layout';

import './Toolbar.scss';

/**
 * Convenience component to insert a pre-styled separator | between Toolbar items.
 */
export const [ToolbarSeparator, toolbarSeparator] = hoistCmpAndFactory({
    displayName: 'ToolbarSeparator',
    model: false, memo: false, observable: false,

    render(props) {
        return span({
            ...props,
            className: getClassName('xh-toolbar__separator', props)
        });
    }
});

/**
 * Abbreviated alias for ToolbarSeparator
 */
export const [ToolbarSep, toolbarSep] = [ToolbarSeparator, toolbarSeparator];
