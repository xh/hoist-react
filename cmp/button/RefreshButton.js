/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, hoistComponent} from 'hoist/core';
import {Icon} from 'hoist/icon';
import {button} from 'hoist/kit/blueprint';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 * Accepts props documented below as well as any others supported by Blueprint's Button.
 *
 * Must be provided either an onClick handler *or* a model. If a model is provided, this button
 * will call loadAsync() on the model class.
 */
@hoistComponent()
export class RefreshButton extends Component {

    static propTypes = {
        icon: PT.element,
        title: PT.string,
        onClick: PT.func,
        model: PT.object
    };

    render() {
        const {icon, title, onClick, ...rest} = this.props;
        return button({
            icon: icon || Icon.sync(),
            title: title || 'Refresh',
            onClick: onClick || this.onRefreshClick,
            ...rest
        });
    }

    //-------------------------
    // Implementation
    //---------------------------
    onRefreshClick = () => {
        this.model.loadAsync();
    }

}
export const refreshButton = elemFactory(RefreshButton);