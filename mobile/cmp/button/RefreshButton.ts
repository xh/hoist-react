/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, Loadable, RefreshContextModel, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';

export interface RefreshButtonProps extends ButtonProps {
    /** Object to refresh when clicked. */
    target?: Loadable;
}

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If an onClick handler is provided it will be used. Otherwise, this button will be linked to
 * the `target` in props with LoadSupport enabled, or to the contextual
 * {@link RefreshContextModel}.
 */
export const [RefreshButton, refreshButton] = hoistCmp.withFactory<RefreshButtonProps>({
    displayName: 'RefreshButton',
    model: false,

    render({target, icon = Icon.sync(), onClick, ...props}) {
        const refreshContextModel = useContextModel(RefreshContextModel);
        if (!onClick) {
            target ??= refreshContextModel;
            onClick = target ? () => target.refreshAsync() : null;
        }

        return button({icon, onClick, ...props});
    }
});
