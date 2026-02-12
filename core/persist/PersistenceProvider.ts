/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {olderThan} from '@xh/hoist/utils/datetime';
import {logDebug, logError, throwIf} from '@xh/hoist/utils/js';
import {
    cloneDeep,
    compact,
    debounce as lodashDebounce,
    get,
    isArray,
    isEmpty,
    isNumber,
    isObject,
    isString,
    isUndefined,
    omit,
    set,
    toPath
} from 'lodash';
import {IReactionDisposer, reaction} from 'mobx';
import {Class} from 'type-fest';
import {DebounceSpec, HoistBase, Persistable, PersistableState} from '../';
import {
    CustomProvider,
    DashViewProvider,
    LocalStorageProvider,
    PersistOptions,
    PrefProvider,
    SessionStorageProvider,
    ViewManagerProvider
} from './';

export type PersistenceProviderConfig<S = any> = {
    persistOptions: PersistOptions;
    target: Persistable<S>;
    owner?: HoistBase;
};

/**
 * Abstract superclass for adaptor objects used by models and components to (re)store state to and
 * from a persistent location, typically a Hoist preference or key within browser local storage.
 *
 * Note that multiple instances of this object may be writing into the same location.
 * Implementations should take care to incorporate any writes immediately into the readable state.
 *
 * Hoist-provided implementations include:
 *   - {@link PrefProvider} - persists to a predefined Hoist JSON Preference.
 *   - {@link LocalStorageProvider} - persists to browser local storage under a configured key.
 *   - {@link DashViewProvider} - persists to a bound `DashViewModel` to save state for components
 *     used within a dashboard widget. For this to be useful, the parent {@link DashModel} must
 *     itself be persisted via a different provider - it acts as a collector of the widget-level
 *     state managed by its DashViewModels and this provider.
 *   - {@link ViewManagerProvider} - persists to saved views managed by {@link ViewManagerModel}.
 *   - {@link CustomProvider} - API for app and components to provide their own storage mechanism.
 */
export abstract class PersistenceProvider<S = any> {
    readonly path: string;
    readonly debounce: DebounceSpec;
    readonly settleTime: number;
    readonly persistDefaultValue: boolean;
    readonly owner: HoistBase;

    protected target: Persistable<S>;
    protected defaultState: PersistableState<S>;

    private disposer: IReactionDisposer;
    private lastReadState: PersistableState<S>;
    private lastReadTime: number;

    /**
     * Construct an instance of this class.
     *
     * Will fail gently, returning `null` and logging an error if the provider could not be created
     * due to an unparseable config or failure on initial read.
     *
     * Note: Targets should initialize their default persistable state *before* creating a
     * `PersistenceProvider` and defer creating reactions to persistable state until *after*. This
     * allows the provider to capture the default state and then apply any persisted state to the
     * target without thrashing.
     */
    static create<S>(cfg: PersistenceProviderConfig<S>): PersistenceProvider<S> {
        let ret: PersistenceProvider<S>;
        try {
            // default owner to target
            cfg = {owner: cfg.target instanceof HoistBase ? cfg.target : cfg.owner, ...cfg};

            const providerClass = this.parseProviderClass<S>(cfg.persistOptions);
            ret = new providerClass(cfg);
            ret.ensureValid();
            ret.bindToTarget(cfg.target);
            return ret;
        } catch (e) {
            logError(e, cfg.owner);
            ret?.destroy();
            return null;
        }
    }

    /**
     * Merge PersistOptions, respecting provider types, with later options overriding earlier ones.
     */
    static mergePersistOptions(
        defaults: PersistOptions,
        ...overrides: PersistOptions[]
    ): PersistOptions {
        const TYPE_RELATED_KEYS = [
            'type',
            'prefKey',
            'localStorageKey',
            'sessionStorageKey',
            'dashViewModel',
            'viewManagerModel',
            'getData',
            'setData'
        ];
        return compact(overrides).reduce(
            (ret, override) =>
                TYPE_RELATED_KEYS.some(key => override[key])
                    ? {
                          ...omit(ret, ...TYPE_RELATED_KEYS),
                          ...override
                      }
                    : {...ret, ...override},
            defaults
        );
    }

    /** Read persisted state at this provider's path. */
    read(): PersistableState<S> {
        const state = get(this.readRaw(), this.path);
        logDebug(['Reading state', state], this.owner);
        const ret = !isUndefined(state) ? new PersistableState(state) : null;
        this.lastReadState = ret;
        this.lastReadTime = Date.now();
        return ret;
    }

    /** Persist JSON-serializable state to this provider's path. */
    write(state: S) {
        logDebug(['Writing state', state], this.owner);
        this.writeInternal(state);
    }

    /** Clear any persisted data at a path. Also clears any parent objects that become empty. */
    clear() {
        logDebug('Clearing state', this.owner);
        const obj = cloneDeep(this.readRaw()),
            path = toPath(this.path);
        do {
            const property = path.pop(),
                parent = isEmpty(path) ? obj : get(obj, path);
            if (parent) delete parent[property];
            if (!isEmpty(parent)) break;
        } while (!isEmpty(path));
        this.writeRaw(obj);
    }

    destroy() {
        this.disposer?.();
    }

    //----------------
    // Protected API
    //----------------
    /** Called by implementations only. Use the {@link create} factory instead. */
    protected constructor(cfg: PersistenceProviderConfig<S>) {
        const {owner, persistOptions} = cfg;
        this.owner = owner;

        const {path, debounce = 250, settleTime, persistDefaultValue = false} = persistOptions;
        throwIf(!path, 'Path not specified in PersistenceProvider.');

        this.path = path;
        this.debounce = debounce;
        this.settleTime = settleTime;
        this.persistDefaultValue = persistDefaultValue;
        this.owner.markManaged(this);

        if (debounce) {
            this.writeInternal = isNumber(debounce)
                ? lodashDebounce(this.writeInternal, debounce)
                : lodashDebounce(this.writeInternal, debounce.interval, debounce);
        }
    }

    /** Called by factory method to bind this provider to its target. */
    protected bindToTarget(target: Persistable<S>) {
        this.target = target;
        this.defaultState = target.defaultPersistableState ?? target.getPersistableState();

        const state = this.read();
        if (state) target.setPersistableState(state);

        // Direct use of MobX reaction to avoid circular dependency with HoistBase
        this.disposer = reaction(
            () => this.target.getPersistableState(),
            state => {
                const {settleTime, lastReadTime, lastReadState, persistDefaultValue, defaultState} =
                    this;
                if (settleTime && !olderThan(lastReadTime, settleTime)) {
                    return;
                } else if (!persistDefaultValue && state.equals(defaultState)) {
                    this.clear();
                } else if (lastReadState && state.equals(lastReadState)) {
                    // If the last read state is equal to the current state, use the last read state
                    // to avoid appearing "dirty"
                    this.write(lastReadState.value);
                } else {
                    this.write(state.value);
                }
            }
        );
    }

    protected writeInternal(data: S) {
        const obj = cloneDeep(this.readRaw());
        set(obj, this.path, data);
        this.writeRaw(obj);
    }

    protected writeRaw(obj: Record<typeof this.path, S>) {}

    protected readRaw(): Record<typeof this.path, S> {
        return null;
    }

    private static parseProviderClass<S>(
        opts: PersistOptions
    ): Class<PersistenceProvider<S>, [PersistenceProviderConfig<S>]> {
        // 1) Recognize shortcut form
        const {type, ...rest} = opts;
        if (!type) {
            if (rest.prefKey) return PrefProvider;
            if (rest.localStorageKey) return LocalStorageProvider;
            if (rest.sessionStorageKey) return SessionStorageProvider;
            if (rest.dashViewModel) return DashViewProvider;
            if (rest.viewManagerModel) return ViewManagerProvider;
            if (rest.getData || rest.setData) return CustomProvider;
        }

        // 2) Map any string to known Provider Class, or return raw class
        const ret = isString(type)
            ? {
                  pref: PrefProvider,
                  localStorage: LocalStorageProvider,
                  sessionStorage: SessionStorageProvider,
                  dashView: DashViewProvider,
                  viewManager: ViewManagerProvider,
                  custom: CustomProvider
              }[type]
            : type;

        throwIf(!ret, `Unknown Persistence Provider: ${type}`);

        return ret;
    }

    private ensureValid() {
        const data = this.readRaw();
        throwIf(
            !(isObject(data) && !isArray(data)),
            `PersistenceProvider for ${this.path} may not be configured correctly.  The provider ` +
                'should produce a javascript object for reading property values.'
        );
    }
}
