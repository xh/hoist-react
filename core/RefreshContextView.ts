/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp} from './';
import {RefreshContextModel, uses, useContextModel} from './model';
import {useEffect} from 'react';

/**
 * Establishes an area of the application with an independent RefreshContextModel.
 *
 * The model established by this view will be refreshed by its parent context but may also be refreshed
 * independently.
 *
 * @see RefreshContextModel
 */
export const [RefreshContextView, refreshContextView] = hoistCmp.withFactory({
    displayName: 'RefreshContextView',
    model: uses(RefreshContextModel, {publishMode: 'limited'}),

    render({model, children}) {
        const parent = useContextModel(
            m => m instanceof RefreshContextModel && m != model
        ) as RefreshContextModel;

        useEffect(() => {
            if (model && parent) {
                parent.register(model);
                return () => parent.unregister(model);
            }
        }, [model, parent]);

        return children;
    }
});
