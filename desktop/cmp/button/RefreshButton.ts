/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    hoistCmp,
    HoistModel,
    WithoutModelAndRef,
    RefreshContextModel,
    useContextModel,
    HoistPropsWithRef
} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {errorIf, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from './Button';

export interface RefreshButtonProps
    extends WithoutModelAndRef<ButtonProps>,
        HoistPropsWithRef<HTMLButtonElement> {
    target?: HoistModel;
}

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If an onClick handler is provided it will be used. Otherwise this button will
 * be linked to any target in props with LoadSupport enabled, or the contextual
 * See {@link RefreshContextModel}.
 */
export const [RefreshButton, refreshButton] = hoistCmp.withFactory<RefreshButtonProps>({
    displayName: 'RefreshButton',
    model: false,

    render({target, onClick, ...props}, ref) {
        const refreshContextModel = useContextModel(RefreshContextModel);

        if (!onClick) {
            errorIf(
                target && !target.loadSupport,
                'Models provided to RefreshButton must enable LoadSupport.'
            );
            target = withDefault(target, refreshContextModel);
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
