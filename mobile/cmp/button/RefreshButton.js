/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {toolbarButton} from '@xh/hoist/kit/onsen';
import {warnIf} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * Can be provided an onClick handler, otherwise will use default action provided by framework.
 */
@HoistComponent
export class RefreshButton extends Component {

    static propTypes = {
        icon: PT.element,

        /** Function to call when the button is clicked. */
        onClick: PT.func,

        /** HoistModel to refresh. */
        model: PT.object
    };

    render() {
        warnIf(
            (this.props.model && this.props.onClick) || (!this.props.model && !this.props.onClick),
            'RefreshButton must be provided either a model or an onClick handler to call (but not both).'
        );

        const {
            icon = Icon.sync(),
            onClick = this.defaultOnClick,
            model,
            ...rest
        } = this.props;

        return toolbarButton({
            item: icon,
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