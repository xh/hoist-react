/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, useContextModel, RefreshContextModel} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {errorIf, withDefault} from '@xh/hoist/utils/js';
import PT from 'prop-types';
import {Button, button} from './Button';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If an onClick handler is provided it will be used. Otherwise this button will
 * be linked to any model in props with LoadSupport enabled, or the contextual
 * {@see RefreshContextModel}.
 */
export const [RefreshButton, refreshButton] = hoistCmp.withFactory({
    displayName: 'RefreshButton',
    model: false,  // For consistency with all other buttons -- the model prop here could be replaced by 'target'

    render({model, onClick, ...props}) {
        const refreshContextModel = useContextModel(RefreshContextModel);

        if (!onClick) {
            errorIf(model && !model.loadSupport, 'Models provided to RefreshButton must enable LoadSupport.');
            model = withDefault(model, refreshContextModel);
            onClick = model ? () => model.refreshAsync() : null;
        }

        return button({
            icon: Icon.refresh(),
            title: 'Refresh',
            intent: 'success',
            onClick,
            ...props
        });
    }
});

RefreshButton.propTypes = {
    ...Button.propTypes,

    /** HoistModel to refresh. */
    model: PT.object
};


