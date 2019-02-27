/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {RefreshContext} from '@xh/hoist/core/refresh';
import {Icon} from '@xh/hoist/icon';
import {button} from '@xh/hoist/mobile/cmp/button';
import {warnIf} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If a model is provided it will be directly refreshed.  Alternatively an onClick handler
 * may be provided.  If neither of these props are provided, the contextual RefreshContextModel
 * for this button will be used.
 */
@HoistComponent
export class RefreshButton extends Component {

    static contextType = RefreshContext;
    
    static propTypes = {
        icon: PT.element,

        /** Function to call when the button is clicked. */
        onClick: PT.func,

        /** HoistModel to refresh. */
        model: PT.object
    };

    render() {
        warnIf(
            this.props.model && this.props.onClick,
            'RefreshButton may be provided either a model or an onClick handler to call (but not both).'
        );

        const {
            icon = Icon.sync(),
            onClick = this.defaultOnClick,
            model,
            ...rest
        } = this.props;

        return button({
            icon: icon,
            onClick,
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    defaultOnClick = () => {
        const target = this.model || this.context;
        if (target) target.refreshAsync();
    };
}
export const refreshButton = elemFactory(RefreshButton);