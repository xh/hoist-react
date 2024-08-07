/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {
    hoistCmp,
    HoistModel,
    HoistPropsWithRef,
    RefreshContextModel,
    useContextModel,
    WithoutModelAndRef
} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {errorIf} from '@xh/hoist/utils/js';

export interface RefreshButtonProps
    extends HoistPropsWithRef<HTMLButtonElement>,
        WithoutModelAndRef<ButtonProps> {
    target?: HoistModel;
}

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If a target is provided it will be directly refreshed.  Alternatively an onClick handler
 * may be provided.  If neither of these props are provided, the contextual RefreshContextModel
 * for this button will be used.
 */
export const [RefreshButton, refreshButton] = hoistCmp.withFactory<RefreshButtonProps>({
    displayName: 'RefreshButton',
    model: false,

    render({target, icon = Icon.sync(), onClick, ...props}) {
        const refreshContextModel = useContextModel(RefreshContextModel);

        if (!onClick) {
            errorIf(
                target && !target.loadSupport,
                'Models provided to RefreshButton must enable LoadSupport.'
            );
            const model = target ?? refreshContextModel;
            onClick = model ? () => model.refreshAsync() : null;
        }

        return button({icon, onClick, ...props});
    }
});
