/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {createContext} from 'react';
import {elemFactory} from '@xh/hoist/core';

/**
 * @private
 *
 * Support for making models available to components via React context.
 *
 * Not created directly by applications.  Components that need to *provide* models to
 * their descendants should use the WithModel component, which will create an instance
 * of this class.
 */
export class ModelLookup {
    model;
    parent;

    /**
     * @param {Object} model -  model provided by this object.
     * @param {ModelLookup} [parent] - parent instance of this class.
     */
    constructor(model, parent) {
        this.model = model;
        this.parent = parent;
    }

    /**
     * Lookup a model in the object, or one of its parents.
     *
     * @param {(Class|string)} [selector] - class or name of mixin applied to class of
     *      model to be returned.  If not provided the model contained in this object will be returned.
     * @returns {*} model or null if no matching model found.
     */
    lookupModel(selector) {
        const {model, parent} = this;

        if (!selector || selector == '*') return model;

        const ret = model.lookupModel(selector);
        if (ret) return ret;

        return parent ? parent.lookupModel(selector) : null;
    }
}

/**
 * @private
 *
 * Context used to publish a ModelLookup
 */
export const ModelLookupContext = createContext(null);

export const modelLookupContextProvider = elemFactory(ModelLookupContext.Provider);
