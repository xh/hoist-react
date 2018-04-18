/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {button} from 'hoist/kit/blueprint';
import {elemFactory, hoistComponent} from 'hoist/core';
import {hbox} from 'hoist/layout';

import './Toolbar.scss';

/**
 * A horizontal toolbar with built-in styling and padding.
 * Child items provided as raw configs will be created as buttons by default.
 */
@hoistComponent()
class Toolbar extends Component {

    render() {
        const {className, vertical, ...rest} = this.props;

        return hbox({
            cls: className ? `${className} xh-toolbar` : 'xh-toolbar',
            vertical: vertical ? 'true' : 'false',
            itemSpec: {
                factory: button
            },
            ...rest
        });
    }

}
export const toolbar = elemFactory(Toolbar);
