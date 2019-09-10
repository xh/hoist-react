/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
import {useState, useContext} from 'react';
import {ModelLookupContext} from '../impl/ModelLookup';
import {useOnUnmount} from '@xh/hoist/utils/react';

/**
 * Hook to allow a component to access a HoistModel provided in context by an ancestor component.
 *
 * @param {(Class|string)} [selector] - class or name of mixin applied to class of
 *      model to be returned.  If not provided the 'closest' inherited model will be returned.
 * @returns model or null if no matching model found.
 */
export function useContextModel(selector) {
    const modelLookup = useContext(ModelLookupContext),
        [ret] = useState(() => {
            if (modelLookup) {
                return modelLookup.lookupModel(selector);
            }
            return null;
        });

    return ret;
}

/**
 * Create a new model that will be maintained for lifetime of component and destroyed
 * when component is unmounted.
 *
 * @param spec
 */
export function useLocalModel(spec) {
    const [ret] = useState(() => spec.isHoistModel ? new spec() : spec.call());
    useOnUnmount(() => XH.safeDestroy(ret));
    return ret;
}
