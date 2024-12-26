/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, Loadable, RefreshContextModel, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from './Button';
import {apiRemoved} from '@xh/hoist/utils/js';

export interface RefreshButtonProps extends ButtonProps {
    /** Object to refresh when clicked. */
    target?: Loadable;
}

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If an onClick handler is provided it will be used. Otherwise, this button will
 * be linked to the target in props with LoadSupport enabled, or the contextual
 * See {@link RefreshContextModel}.
 */
export const [RefreshButton, refreshButton] = hoistCmp.withFactory<RefreshButtonProps>({
    displayName: 'RefreshButton',
    model: false,

    render({target, onClick, ...props}, ref) {
        apiRemoved('model', {test: props.model, msg: 'Use target instead.'});

        const refreshContextModel = useContextModel(RefreshContextModel);
        if (!onClick) {
            target ??= refreshContextModel;
            onClick = target ? () => target.refreshAsync() : null;
        }

        return button({
            ref,
            icon: Icon.refresh(),
            title: 'Refresh',
            intent: 'success',
            onClick,
            ...props
        });
    }
});
