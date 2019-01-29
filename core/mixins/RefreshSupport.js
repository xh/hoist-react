/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import React from 'react';
import {provideMethods, markClass, chainMethods, throwIf} from '@xh/hoist/utils/js';

/**
 * Context establishing an area of the app that can be independently refreshed via a RefreshModel.
 *
 * @see RefreshModel
 * @see RefreshSupport
 */
export const RefreshContext = React.createContext(null);

/**
 * Mixin to indicate that a component has a model that implements loading and refreshing and should
 * participate in a containing RefreshContext.
 *
 * This mixin will cause the component's model to be registered/unregistered with a context-provided
 * RefreshModel when the component is mounted/unmounted. The RefreshModel will then in turn make
 * coordinated calls to loadAsync() and refreshAsync() when coordinating a refresh.
 */
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
            if (refreshModel && model) refreshModel.unregister(model);
        }
    });
}
