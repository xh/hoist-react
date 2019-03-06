/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent, XH} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {withDefault} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for resetting user customizations.
 * Clears all user preferences, all grid state saved to local storage, and then reloads the app.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
@HoistComponent
export class RestoreDefaultsButton extends Component {

    static propTypes = {
        ...Button.propTypes,

        /** Message for confirm dialog shown prior to clearing user customizations. */
        warningMessage: PT.string,

        /** Title for confirm dialog shown prior to clearing user customizations. */
        warningTitle: PT.string
    };

    render() {
        const {icon, text, intent, onClick, ...rest} = this.props;
        return button({
            icon: withDefault(icon, Icon.reset()),
            text: withDefault(text, 'Restore Defaults'),
            intent: withDefault(intent, 'danger'),
            onClick: withDefault(onClick, this.restoreDefaultsWithConfirm),
            ...rest
        });
    }

    //------------------------
    // Implementation
    //------------------------
    restoreDefaultsWithConfirm = () => {
        const {warningTitle, warningMessage} = this.props;
        XH.confirm({
            title: withDefault(warningTitle, 'Are you sure you want to restore defaults?'),
            message: withDefault(warningMessage, 'All customizations will be restored to their default settings'),
            icon: Icon.warning({size: 'lg'}),
            onConfirm: () => XH.restoreDefaultsAsync()
        });
    }

}
export const restoreDefaultsButton = elemFactory(RestoreDefaultsButton);