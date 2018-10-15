/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {hbox, vbox} from '@xh/hoist/cmp/layout';

import './Toolbar.scss';

/**
 * A toolbar with built-in styling and padding.
 * Child items provided as raw configs will be created as buttons by default.
 */
@HoistComponent
export class Toolbar extends Component {
    static propTypes = {
        /** Custom classes that will be applied to this component */
        className: PT.string,
        /** Set to true to vertically align the items of this toolbar */
        vertical: PT.bool
    };

    baseClassName = 'xh-toolbar';

    render() {
        const {vertical, ...rest} = this.props;

        return (vertical ? vbox : hbox)({
            ...rest,
            className: this.getClassName(vertical ? 'xh-toolbar--vertical' : null)
        });
    }
}
export const toolbar = elemFactory(Toolbar);
