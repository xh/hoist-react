/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {hoistComponent, elemFactory} from 'hoist/core';
import {button} from 'hoist/kit/blueprint';
import {Icon} from 'hoist/icon';

/**
 * Button intended for component refresh. Defaults icon to font awesome 'sync'.
 * Defaults click handler to passed model's loadAsync function
 *
 * @prop icon - a valid icon for a blueprint button
 * @prop onClick - a click handler for this button
 *
 *  ...and any other props that can be passed to a blueprint button component.
 */
@hoistComponent()
export class RefreshButton extends Component {

    static defaultProps = {
        icon: Icon.sync()
    }

    render() {
        const {icon, onClick, ...rest} = this.props;
        return button({
            icon: icon,
            onClick: onClick || this.onRefreshClick,
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onRefreshClick = () => {
        this.model.loadAsync();
    }

}
export const refreshButton = elemFactory(RefreshButton);