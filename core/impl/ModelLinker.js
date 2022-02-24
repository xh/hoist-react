/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {XH, RefreshContextModel} from '@xh/hoist/core';
import {useOnUnmount} from '@xh/hoist/utils/react';
import {throwIf} from '@xh/hoist/utils/js';
import {each} from 'lodash';
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
export function useModelLinker(model, modelLookup, props) {
    // 0) Are we executing the link now (i.e. is this the first render)
    const isLinking = model && !model.isLinked;

    // 1) Linking synchronous work: resolve lookups, initialize props, and call onLinked()
    if (isLinking) {
        model._modelLookup = modelLookup;
        each(model._xhInjectedParentProperties, (selector, name) => {
            const parentModel = modelLookup.lookupModel(selector);
            throwIf(
                !parentModel,
                `Failed to resolve @lookup for '${name}'.  Ensure that an appropriate parent
                model exists for this selector in the component hierarchy.`
            );
            model[name] = parentModel;
        });
        model.setComponentProps(props);
        model.onLinked();
    }

    // 2) Linking async work: call afterLinked(), and wire up loadSupport
    useEffect(() => {
        if (isLinking) {
            model.afterLinked();
            if (model.loadSupport) {
                model.loadAsync();
                const refreshContext = modelLookup?.lookupModel(RefreshContextModel);
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