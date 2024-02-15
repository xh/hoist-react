/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistModel, RefreshContextModel, useContextModel} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {errorIf, withDefault} from '@xh/hoist/utils/js';
import {button, ButtonProps} from './Button';

export type RefreshButtonProps = ButtonProps<HoistModel>;

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If an onClick handler is provided it will be used. Otherwise this button will
 * be linked to any model in props with LoadSupport enabled, or the contextual
 * See {@link RefreshContextModel}.
 */
export const [RefreshButton, refreshButton] = hoistCmp.withFactory<RefreshButtonProps>({
    displayName: 'RefreshButton',
    model: false, // For consistency with all other buttons -- the model prop here could be replaced by 'target'

    render({model, onClick, ...props}, ref) {
        const refreshContextModel = useContextModel(RefreshContextModel);

        if (!onClick) {
            let target: HoistModel = model;
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
