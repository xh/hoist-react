/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {hoistComponent, elemFactory} from 'hoist/core';
import {hbox} from 'hoist/layout';

import './Toolbar.scss';

/**
 * A horizontal toolbar with built-in styling and padding
 */
@hoistComponent()
class Toolbar extends Component {

    render() {
        return hbox({
            cls: 'xh-toolbar',
            alignItems: 'center',
            flex: 'none',
            itemSpec: {
                factory: button
            },
            ...this.props
        });
    }

}
export const toolbar = elemFactory(Toolbar);
