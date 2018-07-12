/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {toolbarButton} from '@xh/hoist/kit/onsen';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * Must be provided either an onClick handler *or* a model. If a model is provided, this button
 * will call loadAsync() on the model class.
 */
@HoistComponent()
export class RefreshButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func,
        model: PT.object
    };

    render() {
        const {icon, onClick, ...rest} = this.props;
        return toolbarButton({
            item: icon || Icon.sync(),
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