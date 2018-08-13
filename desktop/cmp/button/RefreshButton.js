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
import {button} from './Button';
import {warnIf} from '@xh/hoist/utils/JsUtils';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 * Accepts props documented below as well as any others supported by Blueprint's Button.
 *
 * Must be provided either an onClick handler *or* a model. If a model is provided and an onClick
 * handler is not provided, this button will call loadAsync() on the model class.
 */
@HoistComponent()
export class RefreshButton extends Component {

    static propTypes = {
        /** Icon to display for the button. Defaults to Icon.sync(). */
        icon: PT.element,
        /** Tooltip text to display when the mouse is over the button. Defaults to 'Refresh'. */
        title: PT.string,
        /** Function to call when the button is clicked. */
        onClick: PT.func,
        /**
         * Model to call loadAsync() on when the button is clicked. Only used if onClick was not
         * provided.
         */
        model: PT.object
    };

    render() {
        warnIf(
            this.props.model && this.props.onClick,
            'Both model and onClick were provided to RefreshButton properties. The model property will be ignored.'
        );

        warnIf(
            !this.props.model && !this.props.onClick,
            'Neither onClick nor model were provided to RefreshButton. Clicking the RefreshButton will have no effect.'
        );

        const {
            icon = Icon.sync(),
            title = 'Refresh',
            onClick = this.model ? this.onRefreshClick : undefined,
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
    onRefreshClick = () => {
        this.model.loadAsync();
    };

}

export const refreshButton = elemFactory(RefreshButton);