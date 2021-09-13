/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import PT from 'prop-types';

/**
 * Convenience Button preconfigured for use as a trigger for resetting user customizations.
 * Clears all user preferences, all grid state saved to local storage, and then reloads the app.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
export const [RestoreDefaultsButton, restoreDefaultsButton] = hoistCmp.withFactory({
    displayName: 'RestoreDefaultsButton',
    model: false,
    render({
        warningTitle = 'Please Confirm',
        warningMessage = 'All app options (including grid customizations) will be restored to their default settings, and the app will be reloaded.',
        ...buttonProps
    }, ref) {
        const onClick = () => {
            XH.confirm({
                title: warningTitle,
                message: warningMessage,
                icon: Icon.warning(),
                onConfirm: () => XH.restoreDefaultsAsync()
            });
        };

        return button({
            ref,
            icon: Icon.reset(),
            text: 'Restore Defaults',
            onClick,
            ...buttonProps
        });
    }
});
RestoreDefaultsButton.propTypes = {
    ...Button.propTypes,

    /** Message for confirm dialog shown prior to clearing user customizations. */
    warningMessage: PT.string,

    /** Title for confirm dialog shown prior to clearing user customizations. */
    warningTitle: PT.string
};

