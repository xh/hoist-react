/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {action, computed, comparer, makeObservable, observable} from '@xh/hoist/mobx';
import {apiDeprecated, warnIf} from '@xh/hoist/utils/js';
import {isFunction} from 'lodash';
import {
    DefaultHoistProps,
    HoistBase,
    LoadSpecConfig,
    managed,
    PlainObject,
    TaskObserver
} from '../';
import {instanceManager} from '../impl/InstanceManager';
import {Loadable, LoadSpec, LoadSupport} from '../load';
import {ModelSelector} from './';
import {Class} from 'type-fest';

/**
 * Base class for *stateful Hoist Models*.
 *
 * A `HoistModel` is the canonical Hoist unit for:
 * - holding observable state (MobX)
 * - implementing business logic and derived/computed values
 * - coordinating async loading / refresh via `loadAsync()`
 * - optionally participating in the component context hierarchy as a **linked model**
 *
 * PURPOSE
 * - Provide a common lifecycle + MobX integration point for Hoist state.
 * - Provide optional managed loading/refresh support when `doLoadAsync()` is implemented.
 * - Provide linked-model features when a model is created via Hoist component wiring.
 *
 * NON-GOALS
 * - This is not a React component.
 * - This is not a generic DI container / service locator (use `lookupModel()` only for linked models).
 * - This does not prescribe app-specific data fetching patterns beyond the `doLoadAsync()` template.
 *
 * KEY CONCEPTS (Hoist vocabulary)
 * - **Model**: a long-lived stateful object backing UI and/or application state.
 * - **Linked model**: a model created for (and bound to) a specific component instance.
 * - **Load support**: managed async loading via {@link LoadSupport} + {@link LoadSpec}.
 *
 * LIFECYCLE / OWNERSHIP
 * - Created by:
 *   - Hoist component factories when configured with `model` (see {@link hoistCmp.factory}).
 *   - The {@link creates} directive or {@link useLocalModel} hook (linked models).
 *   - Application code (unlinked models) when used as general-purpose state holders.
 * - Scope:
 *   - Linked models are 1:1 with a component instance and are destroyed on unmount.
 *   - Unlinked models are owned by application code; you are responsible for lifecycle.
 *
 * LINKED MODEL BEHAVIOR
 * Linked models:
 * - expose observable {@link componentProps} (shallow-observed per prop)
 * - can acquire ancestor models via {@link lookupModel} / `@lookup`
 * - receive {@link onLinked} during the *first render* of the linked component
 * - receive {@link afterLinked} after the first render (via React effect)
 * - are auto-loaded on mount via {@link loadAsync} (if load support is enabled)
 * - register for subsequent refreshes via the nearest {@link RefreshContextModel}
 * - are destroyed when their linked component is unmounted
 *
 * MANAGED LOADING / REFRESH
 * - Implement {@link doLoadAsync} to opt into managed loading via {@link LoadSupport}.
 * - When enabled, callers should use {@link loadAsync}/{@link refreshAsync}/{@link autoRefreshAsync}.
 *   The {@link LoadSpec} instance passed to `doLoadAsync()` can be inspected to determine the
 *   particular type of load that was triggered, as well as to determine if a newer load has already
 *   been triggered via {@link LoadSpec.isStale} and {@link LoadSpec.isObsolete}.
 * - Other load state/metadata is available via {@link loadModel} and timestamps/exceptions accessors.
 *
 * INVARIANTS / ASSUMPTIONS
 * - `makeObservable(this)` is called by this base constructor, registering observables declared
 *    directly on `HoistModel`.
 * - {@link lookupModel} is only valid for linked models, and only during/after {@link onLinked}.
 *
 * ERROR + LOADING BEHAVIOR
 * - If {@link doLoadAsync} is not overridden, load support is not installed and loading APIs are no-ops.
 * - If {@link doLoadAsync} is overridden, {@link LoadSupport} is installed automatically.
 *
 * PERFORMANCE NOTES
 * - {@link componentProps} uses shallow equality; only reference changes to individual props notify observers.
 *
 * COMMON PITFALLS
 * - Declaring new `@observable` properties in a subclass but failing to call `makeObservable(this)`
 *   in the subclass constructor. MobX requires each concrete class introducing observables to
 *   register them explicitly.
 * - Calling {@link lookupModel} before the model is linked (create via {@link creates}/{@link useLocalModel},
 *   and call during/after {@link onLinked}).
 * - Overriding the constructor and forgetting to call `super()`.
 * - Mutating `@observables` outside MobX actions.
 *
 * CANONICAL USAGE
 * ```ts
 * // Linked model backing a Hoist component
 * class MyModel extends HoistModel {
 *   @observable.ref data: SomeData = null;
 *
 *   constructor() {
 *     super();
 *     makeObservable(this);
 *   }
 *
 *   override async doLoadAsync(loadSpec: LoadSpec) {
 *     this.data = await api.loadSomeData(loadSpec);
 *   }
 *
 *   override onLinked() {
 *     const parent = this.lookupModel(ParentModel);
 *     // safe to use parent/componentProps here
 *   }
 * }
 *
 * // In a Hoist component factory
 * export const myView = hoistCmp.factory<MyModel>(({model}) => {
 *   // render using model.data, call model.loadAsync(), etc.
 * });
 * ```
 *
 * SEE ALSO
 * - {@link HoistBase}
 * - {@link LoadSupport}
 * - {@link LoadSpec}
 * - {@link creates}
 * - {@link useLocalModel}
 */
export abstract class HoistModel extends HoistBase implements Loadable {
    /** Type for constructing an instance of this model */
    declare config: unknown;

    static get isHoistModel(): boolean {
        return true;
    }
    get isHoistModel(): boolean {
        return true;
    }

    // Internal State
    // - `_componentProps` is only set for linked models and mirrors the current React props.
    // - `_modelLookup` is injected by Hoist when this model is linked into a component hierarchy.
    // - `_created` is basic lifecycle metadata (useful for diagnostics/ordering).
    @observable.ref _componentProps: DefaultHoistProps | null = null;
    _modelLookup: any = null;
    _created: number = Date.now();

    constructor() {
        super();
        makeObservable(this);

        if (this.doLoadAsync !== HoistModel.prototype.doLoadAsync) {
            this.loadSupport = new LoadSupport(this);
        }

        instanceManager.registerModel(this);
    }

    //----------------
    // Load Support
    //---------------
    /**
     * Provides optional support for Hoist's approach to managed loading.
     *
     * Applications will not typically need to access this object directly. If a subclass
     * declares a concrete implementation of the `doLoadAsync()` template method, an instance of
     * `LoadSupport` will automatically be created and installed to support the extensions below.
     *
     * See the class-level comments above for additional details.
     */
    @managed
    loadSupport: LoadSupport;

    get loadObserver(): TaskObserver {
        return this.loadSupport?.loadObserver;
    }
    get loadModel() {
        apiDeprecated('HoistModel.loadModel', {
            v: 'v82',
            msg: 'Use HoistModel.loadObserver instead.'
        });
        return this.loadSupport?.loadObserver;
    }
    get lastLoadRequested() {
        return this.loadSupport?.lastLoadRequested;
    }
    get lastLoadCompleted() {
        return this.loadSupport?.lastLoadCompleted;
    }
    get lastLoadException() {
        return this.loadSupport?.lastLoadException;
    }
    async refreshAsync(meta?: PlainObject) {
        return this.loadSupport?.refreshAsync(meta);
    }
    async autoRefreshAsync(meta?: PlainObject) {
        return this.loadSupport?.autoRefreshAsync(meta);
    }
    /**
     * Template method for subclasses that want managed loading.
     *
     * Override this method to opt into Hoist's managed loading (i.e. installation of {@link LoadSupport}).
     * Do not call this method directly - call {@link loadAsync}/{@link refreshAsync}/{@link autoRefreshAsync}.
     */
    async doLoadAsync(loadSpec: LoadSpec) {}
    async loadAsync(loadSpec?: LoadSpecConfig) {
        return this.loadSupport?.loadAsync(loadSpec);
    }

    //---------------------------
    // Linked model support
    //---------------------------
    get isLinked(): boolean {
        return !!this._modelLookup;
    }

    /**
     * React props on component linked to this model.
     *
     * Only available for linked models.
     *
     * Observability is based on a shallow computation for each prop (i.e. a reference
     * change in any particular prop will trigger observers to be notified).
     */
    @computed({equals: comparer.shallow})
    get componentProps(): DefaultHoistProps {
        return this._componentProps ?? {};
    }

    /**
     * Called during first render of the component linked to this model.
     *
     * Only available for linked models.
     *
     * This method will be called when this model has been fully linked to the component
     * hierarchy. Use this method for any work requiring the availability of lookup models or
     * componentProps.  Note that this method is called *during* the initial rendering of the
     * linked component.  See also `afterLinked` for a version of this method, that will be called
     * after the first render is complete.
     */
    onLinked() {}

    /**
     * Called after first render of the component linked to this model.
     *
     * Only available for linked models.
     *
     * This method is similar to `onLinked`, however it will be called after rendering has completed
     * using the native react `useEffect` hook.
     */
    afterLinked() {}

    /**
     * Lookup an ancestor model in the context hierarchy.
     *
     * Only available for linked models.
     *
     * @param selector - type of model to lookup.
     * @returns model, or null if no matching model found.
     */
    lookupModel<T extends HoistModel>(selector: ModelSelector<T>): T | null {
        warnIf(
            !this.isLinked,
            'Attempted to execute a lookup from a model that has not yet been linked. ' +
                'Ensure this model was created by `creates` or `useLocalModel` and that this ' +
                'call is occurring during or after the call to onLinked().'
        );
        return this._modelLookup?.lookupModel(selector) ?? null;
    }

    //------------------
    // For use by Hoist
    //------------------
    /** @internal - called by Hoist to keep {@link componentProps} in sync for linked models. */
    @action
    setComponentProps(newProps: DefaultHoistProps | null) {
        this._componentProps = newProps;
    }

    /**
     * @internal
     * Selector matching used by Hoist model lookup.
     *
     * Supported selectors include:
     * - a HoistModel class reference
     * - a predicate function `(model) => selector`
     * - `true` (match any)
     * - `'*'` (match any if `acceptWildcard` is true)
     * - a class name string
     */
    matchesSelector(selector: ModelSelector, acceptWildcard: boolean = false): boolean {
        let sel: any = selector;
        // 1) check class ref first, it's a function, but distinct from callable function below
        if (sel.isHoistModel) return this instanceof sel;

        // 2) Recurse on any function.
        if (isFunction(sel)) {
            return this.matchesSelector(sel(this), acceptWildcard);
        }

        // 3) main tests
        if (sel === true) return true;
        if (sel === '*') return acceptWildcard;
        if (sel === this.constructor.name) return true;
        if (sel?.isHoistModel) return this instanceof sel;

        return false;
    }

    override destroy() {
        super.destroy();
        instanceManager.unregisterModel(this);
    }
}

export type HoistModelClass<T extends HoistModel> = Class<T> | {prototype: Pick<T, keyof T>};
