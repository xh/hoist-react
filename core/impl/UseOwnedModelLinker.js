/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {XH, RefreshContextModel, useContextModel} from '@xh/hoist/core';
import {useOnUnmount} from '@xh/hoist/utils/react';
import {useEffect} from 'react';

/**
 * @private
 *
 * Integrate a HoistModel owned by a component into the component's lifecycle,
 * enabling support for the LoadSupport lifecycle and destruction.
 *
 * No-op, if model is null.
 */

/* eslint-disable react-hooks/exhaustive-deps */
export function useOwnedModelLinker(model) {
    const context = useContextModel(RefreshContextModel);
    useEffect(() => {
        if (model?.implementsLoading) {
            model.loadAsync();
            if (context) {
                context.register(model);
                return () => context.unregister(model);
            }
        }
    }, []);

    useOnUnmount(() => XH.safeDestroy(model));
}