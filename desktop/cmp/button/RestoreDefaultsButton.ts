/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {br, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {ReactNode} from 'react';
import {button, ButtonProps} from './Button';

export interface RestoreDefaultsButtonProps extends ButtonProps {
    /** Message for confirm dialog shown prior to clearing user customizations. */
    warningMessage?: ReactNode;

    /** Title for confirm dialog shown prior to clearing user customizations. */
    warningTitle?: string;
}

/**
 * Convenience Button preconfigured for use as a trigger for resetting user customizations.
 * Clears all user preferences, all grid state saved to local storage, and then reloads the app.
 *
 * Can be provided an onClick handler, otherwise will call default framework handler.
 */
export const [RestoreDefaultsButton, restoreDefaultsButton] =
    hoistCmp.withFactory<RestoreDefaultsButtonProps>({
        displayName: 'RestoreDefaultsButton',
        model: false,

        render(
            {
                warningTitle = 'Please confirm...',
                warningMessage = fragment(
                    'All app options (including grid customizations) will be restored to their default settings, and the app will be reloaded.',
                    br(),
                    br(),
                    'OK to proceed?'
                ),
                ...buttonProps
            },
            ref
        ) {
            const onClick = () => {
                XH.confirm({
                    title: warningTitle,
                    message: warningMessage,
                    icon: Icon.warning(),
                    onConfirm: () => XH.restoreDefaultsAsync(),
                    confirmProps: {
                        text: 'Yes, restore defaults',
                        icon: Icon.reset(),
                        intent: 'primary'
                    }
                });
            };

            return button({
                ref,
                icon: Icon.reset(),
                text: 'Restore Defaults',
                intent: 'danger',
                onClick,
                ...buttonProps
            });
        }
    });
