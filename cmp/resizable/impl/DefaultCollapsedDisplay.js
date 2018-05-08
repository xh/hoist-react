/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, hoistComponent} from 'hoist/core';
import {toolbar} from 'hoist/cmp';
import {hspacer} from 'hoist/layout';

/**
 * A standardized display for a collapsed Resizeable component
 * @private
 */
@hoistComponent()
class DefaultCollapsedDisplay extends Component {
    render() {
        const {title, icon} = this.props;
        if (!title && !icon) return null;

        return toolbar(icon, hspacer(1), title);
    }
}
export const defaultCollapsedDisplay = elemFactory(DefaultCollapsedDisplay);
