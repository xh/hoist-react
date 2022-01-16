/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {useContext, useState} from 'react';
import {ModelLookupContext} from '../impl/ModelLookup';
import {useOwnedModelLinker} from '../impl/UseOwnedModelLinker';

/**
 * Hook to allow a component to access a HoistModel provided in context by an ancestor component.
 *
 * @param {(Class|string)} [selector] - class or name of mixin applied to class of
 *      model to be returned.  Use '*' to return the default model.
 * @returns model or null if no matching model found.
 */
export function useContextModel(selector = '*') {
    const modelLookup = useContext(ModelLookupContext),
        [ret] = useState(() => modelLookup?.lookupModel(selector) ?? null);
    return ret;
}

/**
 * Create a new model that will be maintained for lifetime of component and destroyed
 * when component is unmounted.
 *
 * @param {(Class|function)} [spec] - class of HoistModel to create, or a function to call to generate one.
 */
export function useLocalModel(spec) {
    const [ret] = useState(() => {
        if (!spec) return null;
        return spec.isHoistModel ? new spec() : spec.call();
    });
    const modelLookup = useContext(ModelLookupContext);
    useOwnedModelLinker(ret, modelLookup);
    return ret;
}
