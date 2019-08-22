/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent, elemFactory} from '@xh/hoist/core';
import {getClassName} from '@xh/hoist/utils/react';
import {span} from '@xh/hoist/cmp/layout';

import './Toolbar.scss';

/**
 * Convenience component to insert a pre-styled separator | between Toolbar items.
 */
export const ToolbarSeparator = hoistComponent({
    displayName: 'ToolbarSeperator',
    render(props) {
        return span({
            ...props,
            className: getClassName('xh-toolbar__separator', props)
        });
    }
});
export const toolbarSeparator = elemFactory(ToolbarSeparator);

// TODO: Deprecate/Remove
export const toolbarSep = elemFactory(ToolbarSeparator);
