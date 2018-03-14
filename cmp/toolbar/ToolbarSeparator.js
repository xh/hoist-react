/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import React, {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {span} from 'hoist/layout';

import './Toolbar.scss';

@hoistComponent()
class ToolbarSeparator extends Component {

    render() {
        return <span className="xh-toolbar__separator">|</span>;
    }

}
export const toolbarSep = elemFactory(ToolbarSeparator);
