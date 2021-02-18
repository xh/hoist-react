/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {elemFactory, ModelPublishMode} from '@xh/hoist/core';
import {forOwn, isFunction} from 'lodash';
import {createContext} from 'react';

/**
 * Support for making models available to components via React context.
 * Not created directly by applications. Components specify how/if they publish/source their
 * models from context via the `model` config option passed into the `hoistCmp()` factory.
 * Hoist will in turn create and manage instances of this class to power those links.
 * @private
 */
export class ModelLookup {
    model;
    parent;
    publishMode;

    /**
     * @param {Object} model -  model provided by this object.
     * @param {ModelLookup} parent - parent instance of this class.
     * @param {ModelPublishMode} publishMode - mode for publishing this model to context.
     */
    constructor(model, parent, publishMode) {
        this.model = model;
        this.parent = parent;
        this.publishMode = publishMode;
    }

    /**
     * Lookup a model in the context hierarchy
     *
     * @param {ModelSelector} selector - type of model to lookup.
     * @returns {HoistModel} - model, or null if no matching model found.
     */
    lookupModel(selector = '*') {
        const {model, publishMode, parent} = this,
            modeIsDefault = (publishMode === ModelPublishMode.DEFAULT);

        // Try this model - but only accept wildcard for default mode!
        if (matchesSelector(model, selector, modeIsDefault)) {
            return model;
        }

        // Potentially try this model's direct children, do not accept wildcard
        if (modeIsDefault) {
            let ret = null;
            forOwn(model, (value) => {
                if (matchesSelector(value, selector)) {
                    ret = value;
                    return false;
                }
            });
            if (ret) return ret;
        }

        // Try parent
        return parent?.lookupModel(selector) ?? null;
    }
}

export function matchesSelector(model, selector, acceptWildcard = false) {
    if (!model || !selector)    return false;
    if (selector === '*')       return acceptWildcard;

    if (isFunction(selector)) {
        // Need to distinguish a class constructor from a generic function here
        // In general a clunky op, but can short-circuit: selector almost always a HoistModel!
        return selector.isHoistModel || (selector.toString().startsWith('class')) ?
            model instanceof selector :
            selector(model);
    }
    return false;
}


/**
 * Context used to publish a ModelLookup
 * @private
 */
export const ModelLookupContext = createContext(null);

export const modelLookupContextProvider = elemFactory(ModelLookupContext.Provider);
