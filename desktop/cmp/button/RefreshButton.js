/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useContext} from 'react';
import PT from 'prop-types';
import {hoistComponent, elemFactory} from '@xh/hoist/core';
import {RefreshContext} from '@xh/hoist/core/refresh';
import {Icon} from '@xh/hoist/icon';
import {Button, button} from './Button';
import {warnIf} from '@xh/hoist/utils/js';

/**
 * Convenience Button preconfigured for use as a trigger for a refresh operation.
 *
 * If a model is provided it will be directly refreshed. Alternatively an onClick handler may be
 * provided. If neither of these props are provided, the contextual RefreshContextModel for this
 * button will be used.
 */
export const RefreshButton = hoistComponent({
    displayName: 'RefreshButton',
    render({model, ...buttonProps}) {
        const refreshContext = useContext(RefreshContext);

        warnIf(
            model && buttonProps.onClick,
            'RefreshButton may be provided either a model or an onClick handler to call (but not both).'
        );

        const onClick = () => {
            const target = model || refreshContext;
            if (target) target.refreshAsync();
        };

        return button({
            icon: Icon.refresh(),
            title: 'Refresh',
            intent: 'success',
            onClick,
            ...buttonProps
        });
    }
});
RefreshButton.propTypes = {
    ...Button.propTypes,

    /** HoistModel to refresh. */
    model: PT.object
};

export const refreshButton = elemFactory(RefreshButton);


