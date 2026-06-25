/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {useContext, useEffect, useState} from 'react';
import {throwIf} from '@xh/hoist/utils/js';
import {
    HoistModel,
    HoistModelClass,
    ModelSelector,
    ModelLookupContext,
    ModelLookup,
    formatSelector,
    RefreshContextModel
} from './';

import {XH} from '../';
import {useOnUnmount} from '@xh/hoist/utils/react';
import {each, isUndefined} from 'lodash';

/**
 * Hook to allow a component to access a HoistModel provided in context by an ancestor component.
 * @param selector - selector to identify the model to be returned.
 * @returns model or null if no matching model found.
 */
export function useContextModel<T extends HoistModel>(selector: ModelSelector<T> = '*'): T {
    const modelLookup = useContext(ModelLookupContext);
    return modelLookup?.lookupModel(selector);
}

/**
 * Create a new model that will be maintained for lifetime of the component and destroyed when the
 * component is unmounted.
 * @param spec - class of HoistModel to create, or a function returning one.
 */
export function useLocalModel<T extends HoistModel>(spec?: HoistModelClass<T> | (() => T)): T {
    const [ret] = useState(() => {
        const s = spec as any;
        if (!s) return null;
        return s.isHoistModel ? new s() : s.call();
    });
    const {modelLookup, props} = localModelContext;
    throwIf(
        !modelLookup || !props,
        'Cannot use useLocalModel() in this render method. ' +
            'Please ensure that this is a HoistComponent and that its `model` spec is not falsy.'
    );
    useModelLinker(ret, modelLookup, props);
    return ret;
}

/**
 * Integrate a HoistModel owned by a component into the component's lifecycle, enabling support for
 * both the Loading lifecycle and destruction. No-op, if model is null.
 * @internal
 */
/* eslint-disable react-hooks/exhaustive-deps */
export function useModelLinker(model: HoistModel, modelLookup: ModelLookup, props: object) {
    // 0) Are we executing the link now (i.e. is this the first render)
    const isLinking = model && !model.isLinked;

    // 1) Linking synchronous work: resolve lookups, initialize props, and call onLinked()
    if (isLinking) {
        model._modelLookup = modelLookup;
        each(model['_xhInjectedParentProperties'], (selector, name) => {
            const parentModel = modelLookup?.lookupModel(selector);
            if (!parentModel) {
                throw XH.exception(
                    `Failed to resolve @lookup for property '${name}' with selector ${formatSelector(
                        selector
                    )}.
                    Ensure that an appropriate parent model exists for this selector in the component hierarchy.`
                );
            }
            model[name] = parentModel;
        });

        // Linked models with an impl parent that are not explicitly marked should be marked as impl.
        if (isUndefined(model.xhImpl)) {
            const parentModel = modelLookup?.lookupModel('*');
            if (parentModel?.xhImpl === true) {
                model.xhImpl = true;
            }
        }

        model.setComponentProps(props);
        model.onLinked();
    }

    // 2) Linking async work: call afterLinked(), and wire up loadSupport
    useEffect(() => {
        if (isLinking) {
            model.afterLinked();
            if (model.loadSupport) {
                model.loadAsync();
                const refreshContext = modelLookup?.lookupModel(
                    RefreshContextModel
                ) as RefreshContextModel;
                if (refreshContext) {
                    refreshContext.register(model);
                    return () => refreshContext.unregister(model);
                }
            }
        }
    }, []);

    // 3) Subsequent renders: update props (async to avoid triggering synchronous state changes)
    useEffect(() => {
        if (!isLinking) model?.setComponentProps(props);
    }, [props]);

    // 4) Destroy on unmount
    useOnUnmount(() => XH.safeDestroy(model));
}

/**
 * Default Context for useLocalModel.
 * Set by HoistComponent during render to minimize app boilerplate required.
 * @internal
 */
export const localModelContext = {modelLookup: null, props: null};
