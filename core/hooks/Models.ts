/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {useContext, useState} from 'react';
import {throwIf} from '@xh/hoist/utils/js';
import {HoistModel, HoistModelClass} from '../HoistModel';
import {ModelSelector} from '../ModelSelector'
import {ModelLookupContext} from '../impl/ModelLookup';
import {useModelLinker} from '../impl/ModelLinker';

/**
 * Hook to allow a component to access a HoistModel provided in context by an ancestor component.
 *
 * @param [selector] - selector to identify model to be returned.
 * @returns model or null if no matching model found.
 */
export function useContextModel(selector: ModelSelector = '*'): HoistModel {
    const modelLookup = useContext(ModelLookupContext),
        [ret] = useState(() => modelLookup?.lookupModel(selector) ?? null);
    return ret;
}

/**
 * Create a new model that will be maintained for lifetime of component and destroyed
 * when component is unmounted.
 *
 * @param [spec] - class of HoistModel to create, or a function to call to generate one.
 */
export function useLocalModel(spec?: HoistModelClass | (() => HoistModel)): HoistModel {
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
 * @package -- not for application use.
 *
 * Default Context for useLocalModel.  Set by HoistComponent during render to minimize app
 * boiler plate required.
 * @type {null}
 */
export const localModelContext = {modelLookup: null, props: null};
