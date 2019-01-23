/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, RefreshContext} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button} from './Button';
import {warnIf} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * Must be provided either an onClick handler *or* a model. If a model is provided and an onClick
 * handler is not provided, this button will call loadAsync() on the model class.
 */
@HoistComponent
export class RefreshButton extends Component {

    static contextType = RefreshContext;

    static propTypes = {

        /** Icon to display for the button. Defaults to Icon.refresh(). */
        icon: PT.element,

        /** Tooltip text. */
        title: PT.string,

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
            icon = Icon.refresh(),
            title = 'Refresh',
            onClick = this.defaultOnClick,
            model,
            ...rest
        } = this.props;

        return button({
            icon,
            title,
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