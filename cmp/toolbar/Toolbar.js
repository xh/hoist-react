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
 * A toolbar with built-in styling and padding.
 * Child items provided as raw configs will be created as buttons by default.
 */
@hoistComponent()
class Toolbar extends Component {
    /**
     * @prop {boolean} vertical - Set to true to vertically align the items of this toolbar
     */
    render() {
        const {className, vertical, ...rest} = this.props;
        let baseCls = 'xh-toolbar';
        if (vertical) baseCls += ' vertical';

        return hbox({
            cls: className ? `${className} ${baseCls}` : baseCls,
            itemSpec: {
                factory: button
            },
            ...rest
        });
    }

}
export const toolbar = elemFactory(Toolbar);
