/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, Loadable, RefreshContextModel, useContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import '@xh/hoist/mobile/register';
import {apiRemoved} from '@xh/hoist/utils/js';

export interface RefreshButtonProps extends ButtonProps {
    /** Object to refresh when clicked. */
    target?: Loadable;
}

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If a model is provided it will be directly refreshed.  Alternatively an onClick handler
 * may be provided.  If neither of these props are provided, the contextual RefreshContextModel
 * for this button will be used.
 */
export const [RefreshButton, refreshButton] = hoistCmp.withFactory<RefreshButtonProps>({
    displayName: 'RefreshButton',
    model: false,

    render({target, icon = Icon.sync(), onClick, ...props}) {
        apiRemoved('model', {test: props.model, msg: 'Use target instead.'});

        const refreshContextModel = useContextModel(RefreshContextModel);
        if (!onClick) {
            target ??= refreshContextModel;
            onClick = target ? () => target.refreshAsync() : null;
        }

        return button({icon, onClick, ...props});
    }
});
