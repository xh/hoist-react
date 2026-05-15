/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory, ModelSelector, HoistModel, ModelPublishMode} from './..';
import {isObservableProp, untracked} from '@xh/hoist/mobx';
import {forOwn} from 'lodash';
import {createContext} from 'react';

/**
 * Support for making models available to components via React context.
 *
 * Not created directly by applications. Components specify how/if they publish/source their
 * models from context via the `model` config option passed into the `hoistCmp()` factory.
 * Hoist will in turn create and manage instances of this class to power those links.
 *
 * @internal
 */
export class ModelLookup {
    model: HoistModel;
    parent: ModelLookup;
    publishMode: ModelPublishMode;

    constructor(model: HoistModel, parent: ModelLookup, publishMode: ModelPublishMode) {
        this.model = model;
        this.parent = parent;
        this.publishMode = publishMode;
    }

    /**
     * Lookup a model in the context hierarchy
     * @returns model, or null if no matching model found.
     */
    lookupModel(selector: ModelSelector): HoistModel {
        const {model, publishMode, parent} = this,
            modeIsDefault = publishMode === 'default';

        if (model.matchesSelector(selector, modeIsDefault)) {
            return model;
        }

        // Try model's direct children. Wildcard not accepted (but would capture model itself above).
        // Scans both own instance properties (plain class fields, e.g. `@managed grid = new GridModel()`)
        // and accessor-defined fields (e.g. `@observable.ref accessor chartModel: ChartModel`)
        if (modeIsDefault) {
            const match = this.findChildModelMatching(model, selector);
            if (match) return match;
        }

        // Try parent
        return parent?.lookupModel(selector) ?? null;
    }

    //----------------
    // Implementation
    //----------------
    private findChildModelMatching(model: HoistModel, selector: ModelSelector): HoistModel | null {
        // 1) Own enumerable properties — covers plain class fields
        //    (e.g. `@managed grid = new GridModel()`).
        let ret = null;
        forOwn(model, (value, key) => {
            if (this.isMatchingChild(key, value, selector)) {
                ret = value;
                return false;
            }
        });
        if (ret) return ret;

        // 2) Accessor/getter observables on the prototype chain — covers TC39 accessor fields
        //    (e.g. `@observable.ref accessor chartModel: ChartModel`) which are non-enumerable
        //    and invisible to forOwn. Stop at HoistModel to avoid framework-level getters.
        //    Wrapped in untracked() to avoid creating spurious MobX dependencies.
        return untracked(() => {
            for (
                let proto = Object.getPrototypeOf(model);
                proto && proto !== HoistModel.prototype && proto !== Object.prototype;
                proto = Object.getPrototypeOf(proto)
            ) {
                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (
                        key === 'constructor' ||
                        !Object.getOwnPropertyDescriptor(proto, key)?.get ||
                        !isObservableProp(model, key)
                    )
                        continue;
                    const value = (model as any)[key];
                    if (this.isMatchingChild(key, value, selector)) return value;
                }
            }
            return null;
        });
    }

    private isMatchingChild(key: string, value: any, selector: ModelSelector): boolean {
        return !key.startsWith('_') && value?.isHoistModel && value.matchesSelector(selector);
    }
}

/**
 * Context used to publish a ModelLookup
 */
export const ModelLookupContext = createContext(null);

export const modelLookupContextProvider = elementFactory(ModelLookupContext.Provider);
