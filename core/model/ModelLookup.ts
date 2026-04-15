/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory, ModelSelector, HoistModel, ModelPublishMode} from './..';
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
        // and accessor-defined fields (e.g. `@observable.ref accessor chartModel: ChartModel`), which
        // under TC39 decorators live as non-enumerable getter/setter pairs on the prototype chain
        // rather than own enumerable instance properties.
        if (modeIsDefault) {
            const match = findChildModelMatching(model, selector);
            if (match) return match;
        }

        // Try parent
        return parent?.lookupModel(selector) ?? null;
    }
}

//---------------------
// Implementation
//---------------------
function findChildModelMatching(model: HoistModel, selector: ModelSelector): HoistModel | null {
    const seen = new Set<string>();
    const check = (key: string, value: any): HoistModel | null => {
        if (seen.has(key)) return null;
        seen.add(key);
        if (key.startsWith('_') || key === 'constructor') return null;
        return value?.isHoistModel && value.matchesSelector(selector) ? value : null;
    };

    // 1) Own instance properties (enumerable + non-enumerable) — covers plain class-field
    //    initializers and any framework-set instance props.
    for (const key of Object.getOwnPropertyNames(model)) {
        const hit = check(key, (model as any)[key]);
        if (hit) return hit;
    }

    // 2) Accessor/getter properties on the prototype chain — covers `@observable.ref accessor foo`
    //    style declarations. Stop at the base Object to avoid pulling in unrelated getters below
    //    HoistBase, but do visit HoistBase/HoistModel getters (they're guarded by the `_`/prefix
    //    check and the isHoistModel filter above).
    let proto = Object.getPrototypeOf(model);
    while (proto && proto !== Object.prototype) {
        for (const key of Object.getOwnPropertyNames(proto)) {
            const desc = Object.getOwnPropertyDescriptor(proto, key);
            if (!desc || !desc.get) continue;
            const hit = check(key, (model as any)[key]);
            if (hit) return hit;
        }
        proto = Object.getPrototypeOf(proto);
    }

    return null;
}

/**
 * Context used to publish a ModelLookup
 */
export const ModelLookupContext = createContext(null);

export const modelLookupContextProvider = elementFactory(ModelLookupContext.Provider);
