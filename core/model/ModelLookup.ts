/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {elementFactory, ModelSelector, HoistModel, ModelPublishMode} from './..';
import {isObservableProp, untracked} from '@xh/hoist/mobx';
import {find} from 'lodash';
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
     * Lookup a model in the context hierarchy.
     * @returns model, or null if no matching model found.
     *
     * Walk runs inside `untracked()`; we then tracked-read whatever `trackKeys` ended up
     * with — the matched slot if any level resolved, or every nullish accessor we walked
     * past if not (so a late arrival triggers re-resolve).
     */
    lookupModel(selector: ModelSelector): HoistModel {
        const trackKeys: TrackKeys = {value: []};
        const result = untracked(() => this.lookupModelInternal(selector, trackKeys));
        for (const [model, key] of trackKeys.value) {
            void (model as any)[key];
        }
        return result;
    }

    //----------------
    // Implementation
    //----------------
    private lookupModelInternal(selector: ModelSelector, trackKeys: TrackKeys): HoistModel {
        const {model, publishMode, parent} = this,
            modeIsDefault = publishMode === 'default';

        if (model.matchesSelector(selector, modeIsDefault)) {
            trackKeys.value = [];
            return model;
        }

        if (modeIsDefault) {
            const match = this.findChildMatch(model, selector, trackKeys);
            if (match) return match;
        }

        return parent?.lookupModelInternal(selector, trackKeys) ?? null;
    }

    // Scan this model's own props (plain class fields like `@managed grid = new GridModel()`)
    // and accessor-defined fields (TC39 `@observable.ref accessor chartModel: ChartModel`).
    private findChildMatch(
        model: HoistModel,
        selector: ModelSelector,
        track: TrackKeys
    ): HoistModel {
        // 1) Own enumerable plain class fields — not observable under TC39, no MobX tracking needed.
        const match = find(model, (v, k) => this.isMatchingChild(k, v, selector)) as HoistModel;
        if (match) {
            track.value = [];
            return match;
        }

        // 2) TC39 accessor observables on the prototype chain — invisible to `find` above.
        // If we find one, track and return, otherwise track the null slots we encountered
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
                if (this.isMatchingChild(key, value, selector)) {
                    track.value = [[model, key]];
                    return value;
                }
                if (value == null) track.value.push([model, key]);
            }
        }
        return null;
    }

    private isMatchingChild(key: string, value: any, selector: ModelSelector): boolean {
        return !key.startsWith('_') && value?.isHoistModel && value.matchesSelector(selector);
    }
}

interface TrackKeys {
    value: Array<[HoistModel, string]>;
}

/**
 * Context used to publish a ModelLookup
 */
export const ModelLookupContext = createContext(null);

export const modelLookupContextProvider = elementFactory(ModelLookupContext.Provider);
