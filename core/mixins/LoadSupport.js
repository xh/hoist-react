/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {markClass, chainMethods, throwIf} from '@xh/hoist/utils/js';
import {RefreshContext} from '../refresh/RefreshContext';

/**
 * Mixin to indicate that a Component's primary backing model implements data loading.
 *
 * This mixin will register the component's primary model with the appropriate RefreshContextModel
 * and call the model's loadAsync() method when the component is first mounted. It will also
 * unregister the model from the same RefreshContextModel when the component is unmounted.
 *
 * Implementation Note:
 * The use of this mixin is required for technical reasons, due to limitations of the pre-hooks
 * context API. Expect this to be built in to all HoistComponents in future versions of Hoist.
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
