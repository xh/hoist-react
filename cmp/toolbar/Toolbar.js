/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {button} from 'hoist/kit/blueprint';
import {elemFactory, hoistComponent} from 'hoist/core';
import {hbox, vbox} from 'hoist/layout';

import './Toolbar.scss';

/**
 * A toolbar with built-in styling and padding.
 * Child items provided as raw configs will be created as buttons by default.
 */
@hoistComponent()
class Toolbar extends Component {
    static propTypes = {
        /** Custom classes that will be applied to this component */
        className: PT.string,
        /** Set to true to vertically align the items of this toolbar */
        vertical: PT.bool
    };

    render() {
        const {className, vertical, ...rest} = this.props;
        let baseCls = 'xh-toolbar';
        if (vertical) baseCls += ' xh-toolbar--vertical';

        return (vertical ? vbox : hbox)({
            cls: className ? `${className} ${baseCls}` : baseCls,
            itemSpec: {
                factory: button
            },
            ...rest
        });
    }

}
export const toolbar = elemFactory(Toolbar);
