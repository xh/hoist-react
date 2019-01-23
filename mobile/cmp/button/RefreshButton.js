/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {XH, elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {toolbarButton} from '@xh/hoist/kit/onsen';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * Can be provided an onClick handler, otherwise will use default action provided by framework.
 */
@HoistComponent
export class RefreshButton extends Component {

    static propTypes = {
        icon: PT.element,
        onClick: PT.func
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
        XH.refreshModel.refreshAsync();
    }
}
export const refreshButton = elemFactory(RefreshButton);