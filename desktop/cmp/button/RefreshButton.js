/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistCmp, elemFactory, useModel} from '@xh/hoist/core';
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
export const RefreshButton = hoistCmp({
    displayName: 'RefreshButton',

    render({model, ...props}) {
        warnIf(
            model && props.onClick,
            'RefreshButton may be provided either a model or an onClick handler to call (but not both).'
        );

        const target = useModel('RefreshContextModel') || model;

        return button({
            icon: Icon.refresh(),
            title: 'Refresh',
            intent: 'success',
            onClick: () => target && target.refreshAsync(),
            ...props
        });
    }
});

RefreshButton.propTypes = {
    ...Button.propTypes,

    /** HoistModel to refresh. */
    model: PT.object
};

export const refreshButton = elemFactory(RefreshButton);


