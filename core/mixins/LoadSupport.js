/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {provideMethods, markClass, chainMethods, throwIf} from '@xh/hoist/utils/js';
import {RefreshContext} from '../RefreshContext';


/**
 * Mixin to indicate that a component has a model that implements loading and refreshing and should
 * participate in a containing RefreshContext.
 *
 * This mixin will cause the component's model to load after the component is mounted.
 *
 * This mixin will cause the component's model to be registered/unregistered with the appropriate
 * RefreshContextModel when the component is mounted/unmounted. The RefreshContextModel will then
 * in turn make coordinated calls to loadAsync() and refreshAsync() when coordinating a refresh.
 */
export function LoadSupport(C) {

    markClass(C, 'hasLoadSupport');

    throwIf(C.contextType,  'Cannot decorate a class with LoadSupport if it already uses context type');
    C.contextType = RefreshContext;

    provideMethods(C, {
        refreshContextModel: {
            get() {return this.context}
        }
    });

    chainMethods(C, {
        componentDidMount() {
            const {refreshContextModel, model} = this;
            if (refreshContextModel && model) refreshContextModel.register(model);

            if (model) model.loadAsync();
        },

        componentWillUnmount() {
            const {refreshContextModel, model} = this;
            if (refreshContextModel && model) refreshContextModel.unregister(model);
        }
    });
}
