/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import {span} from '@xh/hoist/cmp/layout';

import './Toolbar.scss';

/**
 * Convenience component to insert a pre-styled separator | between Toolbar items.
 */
@HoistComponent()
class ToolbarSeparator extends Component {

    static baseCls = 'xh-toolbar__separator';

    render() {
        return span();
    }

}
export const toolbarSep = elemFactory(ToolbarSeparator);
