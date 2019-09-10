/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {useEffect} from 'react';
import {hoistCmpAndFactory, receive} from '@xh/hoist/core';
import {useContextModel} from '@xh/hoist/core/index';

/**
 * Establishes an area of the application with an independent RefreshContextModel.
 *
 * The model established by this view will be refreshed by its parent context but may also be refreshed
 * independently.
 *
 * @see RefreshContextModel
 */
export const [RefreshContextView, refreshContextView] = hoistCmpAndFactory({
    displayName: 'RefreshContextView',
    model: receive('RefreshContextModel'),

    render({model, children}) {
        const parent = useContextModel(m => m.isRefreshContextModel && m != model);

        useEffect(() => {
            if (model && parent) {
                parent.register(model);
                return () => parent.unregister(model);
            }
        });

        return children;
    }
});