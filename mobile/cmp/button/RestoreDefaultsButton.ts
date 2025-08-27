/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {fragment, p} from '@xh/hoist/cmp/layout';
import {hoistCmp, XH} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {ReactNode} from 'react';

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
                    p(
                        'All app options (including grid customizations) will immediately be restored to their default settings.'
                    ),
                    p('This app will then automatically reload. OK to proceed?')
                ),
                ...buttonProps
            },
            ref
        ) {
            const onClick = () => {
                XH.confirm({
                    title: warningTitle,
                    message: warningMessage,
                    onConfirm: () => XH.restoreDefaultsAsync(),
                    confirmProps: {
                        text: 'Yes, restore defaults',
                        icon: Icon.reset(),
                        intent: 'primary'
                    }
                });
            };

            return button({
                text: 'Restore Defaults',
                icon: Icon.reset(),
                minimal: true,
                modifier: 'large',
                onClick,
                ref,
                ...buttonProps
            });
        }
    });
