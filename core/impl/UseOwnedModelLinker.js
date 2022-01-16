/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, RefreshContextModel} from '@xh/hoist/core';
import {useOnUnmount} from '@xh/hoist/utils/react';
import {useEffect} from 'react';

/**
 * @private
 *
 * Integrate a HoistModel owned by a component into the component's lifecycle,
 * enabling support for both the Loading lifecycle and destruction.
 *
 * No-op, if model is null.
 */

/* eslint-disable react-hooks/exhaustive-deps */
export function useOwnedModelLinker(model, modelLookup) {
    if (model) {
        model._modelLookup = modelLookup;
        model.onLinked();
    }
    useEffect(() => {
        if (model?.loadSupport) {
            model.loadAsync();
            const refreshContext = modelLookup?.lookupModel(RefreshContextModel);
            if (refreshContext) {
                refreshContext.register(model);
                return () => refreshContext.unregister(model);
            }
        }
    }, []);

    useOnUnmount(() => XH.safeDestroy(model));
}
