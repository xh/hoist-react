/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {markClass, chainMethods, throwIf} from '@xh/hoist/utils/js';
import {RefreshContext} from '../refresh/RefreshContext';

/**
 * Mixin to indicate that a component has a model that implements data loading.
 *
 * This mixin will cause the loadAsync() method to be called on any owned model when this component is
 * first mounted.  This mixin will also cause the component's model to be registered/unregistered with
 * the appropriate RefreshContextModel when the component is mounted/unmounted.
 *
 * Implementation Note:
 * The use of this mixin is required for technical reasons, due to limitations of the pre-hooks
 * context API.   Expect this behavior to be built in to all HoistComponents in future versions of hoist.
 */
export function LoadSupport(C) {

    markClass(C, 'hasLoadSupport');

    throwIf(C.contextType,  'Cannot decorate a class with LoadSupport if it already uses context type.');
    C.contextType = RefreshContext;

    chainMethods(C, {
        componentDidMount() {
            const {context, model} = this;
            if (context && model) context.register(model);

            model.loadAsync({isRefresh: false, isAutoRefresh: false});
        },

        componentWillUnmount() {
            const {context, model} = this;
            if (context && model) context.unregister(model);
        }
    });

    return C;
}
