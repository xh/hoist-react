/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistComponent} from '@xh/hoist/core';
import {getClassName} from '@xh/hoist/utils/react';
import {span} from '@xh/hoist/cmp/layout';

import './Toolbar.scss';

/**
 * Convenience component to insert a pre-styled separator | between Toolbar items.
 */
export const [ToolbarSep, toolbarSep] = hoistComponent(function ToolbarSep(props) {
    return span({
        ...props,
        className: getClassName('xh-toolbar__separator', props)
    });
});