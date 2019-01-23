/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {provideMethods, markClass, chainMethods, throwIf} from '@xh/hoist/utils/js';

export const RefreshContext = React.createContext(null);

export function RefreshSupport(C) {

    markClass(C, 'hasRefreshSupport');

    throwIf(C.contextType,  'Cannot decorate a class with RefreshSupport if it already uses context type');
    C.contextType = RefreshContext;

    provideMethods(C, {
        refreshModel: {
            get() {return this.context}
        }
    });

    chainMethods(C, {
        componentDidMount() {
            const {refreshModel, model} = this;
            if (refreshModel && model) refreshModel.register(model);
        },

        componentWillUnmount() {
            const {refreshModel, model} = this;
            if (refreshModel && model) refreshModel.unregister(this, model);
        }
    });
}
