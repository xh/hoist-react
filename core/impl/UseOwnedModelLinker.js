/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {useEffect} from 'react';
import {useModel} from '../hooks/UseModel';
import {useOnUnmount} from '@xh/hoist/utils/react';

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
    const context = useModel('RefreshContextModel');
    useEffect(() => {
        if (model && model.isLoadSupport) {
            model.loadAsync();
            if (context) {
                context.register(model);
                return () => context.unregister(model);
            }
        }
    }, []);

    useOnUnmount(() => {
        if (model && model.destroy) model.destroy();
    });
}