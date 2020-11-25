/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {elemFactory, ModelPublishMode} from '@xh/hoist/core';
import {forOwn} from 'lodash';
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
     * @param {(Class|string)} selector - class or name of mixin applied to class of
     *      model to be returned, or '*' to return the default model.
     * @returns {*} model or null if no matching model found.
     */
    lookupModel(selector = '*') {
        const {model, publishMode, parent} = this,
            modeIsDefault = (publishMode === ModelPublishMode.DEFAULT),
            isWildcard = (selector === '*');

        // Try this model
        if ((isWildcard && modeIsDefault) || (!isWildcard && matchesSelector(model, selector))) {
            return model;
        }

        // Potentially try this model's direct children
        if (modeIsDefault) {
            let ret = null;
            forOwn(model, (value, key) => {
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

function matchesSelector(model, selector) {
    return model?.matchesSelector && model.matchesSelector(selector);
}

/**
 * Context used to publish a ModelLookup
 * @private
 */
export const ModelLookupContext = createContext(null);

export const modelLookupContextProvider = elemFactory(ModelLookupContext.Provider);
