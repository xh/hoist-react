/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {PropTypes as PT} from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';

/**
 * Convenience Button preconfigured for use as a trigger for resetting user
 * customizations. Clears all grid state and preferences, then reloads the app.
 * Accepts props documented below as well as any supported by Blueprint's Button.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
@HoistComponent()
export class RestoreDefaultsButton extends Component {

    static propTypes = {
        icon: PT.element,
        text: PT.string,
        intent: PT.string,
        warningTitle: PT.string,
        warningMessage: PT.string,
        onClick: PT.func
    };

    render() {
        const {icon, text, intent, onClick, ...rest} = this.props;
        return button({
            icon: icon || Icon.refresh(),
            text: text || 'Restore Defaults',
            intent: intent || 'danger',
            onClick: onClick || this.onRestoreClick,
            ...rest
        });
    }

    //---------------------------
    // Implementation
    //---------------------------
    onRestoreClick = () => {
        const {warningTitle, warningMessage} = this.props;
        XH.confirm({
            title: warningTitle || 'Are you sure you want to restore defaults?',
            message: warningMessage || 'All customizations will be restored to their default settings',
            icon: Icon.warning({size: 'lg'}),
            onConfirm: () => XH.restoreDefaultsAsync()
        });
    }

}

export const restoreDefaultsButton = elemFactory(RestoreDefaultsButton);