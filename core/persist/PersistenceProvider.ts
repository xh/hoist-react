/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {logDebug, logError, throwIf} from '@xh/hoist/utils/js';
import {
    cloneDeep,
    debounce as lodashDebounce,
    get,
    isEmpty,
    isNumber,
    isUndefined,
    set,
    toPath
} from 'lodash';
import {IReactionDisposer, reaction} from 'mobx';
import {DebounceSpec, HoistBase, Persistable, PersistableState, XH} from '../';
import {
    CustomProvider,
    DashViewProvider,
    LocalStorageProvider,
    PersistOptions,
    PrefProvider,
    ViewManagerProvider
} from './';

export type PersistenceProviderConfig<S> =
    | {
          persistOptions: PersistOptions;
          target: Persistable<S>;
          owner: HoistBase;
      }
    | {
          persistOptions: PersistOptions;
          target: Persistable<S> & HoistBase;
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
 *   - {@link PrefProvider} - stores state in a predefined Hoist JSON Preference.
 *   - {@link LocalStorageProvider} - stores state in browser local storage under a configured key.
 *   - {@link DashViewProvider} - stores view (widget) state via a bound `DashViewModel`. For use
 *     with any components or models nested within a Dashboard. For this to be useful, the parent
 *     `Dash[Container|Canvas]Model` must itself be persisted via a different provider - it acts as
 *     a collector of the widget-level state managed by its DashViewModels and this provider.
 *   - {@link CustomProvider} - API for app and components to provide their own storage mechanism.
 */
export abstract class PersistenceProvider<S> {
    readonly path: string;
    readonly debounce: DebounceSpec;
    readonly owner: HoistBase;

    protected target: Persistable<S>;
    protected defaultState: PersistableState<S>;

    private disposer: IReactionDisposer;

    /**
     * Construct an instance of this class.
     *
     * Will fail gently, returning `null` and logging an error if the provider could not be created
     * due to an unparseable config or failure on initial read.
     *
     * Note:
     * - Targets should initialize their default persistable state *before* creating a
     *   `PersistenceProvider` and avoid setting up any reactions to persistable state until *after*
     */
    static create<S>(cfg: PersistenceProviderConfig<S>): PersistenceProvider<S> {
        cfg = {
            owner: cfg.target instanceof HoistBase ? cfg.target : cfg.owner,
            ...cfg
        };
        const {target, persistOptions} = cfg;

        let {type, ...rest} = persistOptions,
            ret: PersistenceProvider<S>;

        try {
            if (!type) {
                if (rest.prefKey) type = 'pref';
                if (rest.localStorageKey) type = 'localStorage';
                if (rest.dashViewModel) type = 'dashView';
                if (rest.viewManagerModel) type = 'viewManager';
                if (rest.getData || rest.setData) type = 'custom';
            }

            switch (type) {
                case 'pref':
                    ret = new PrefProvider(cfg);
                    break;
                case 'localStorage':
                    ret = new LocalStorageProvider(cfg);
                    break;
                case `dashView`:
                    ret = new DashViewProvider(cfg);
                    break;
                case `viewManager`:
                    ret = new ViewManagerProvider(cfg);
                    break;
                case 'custom':
                    ret = new CustomProvider(cfg);
                    break;
                default:
                    throw XH.exception(`Unknown Persistence Provider for type: ${type}`);
            }

            ret.bindToTarget(target);
            return ret;
        } catch (e) {
            logError(e, cfg.owner);
            ret?.destroy();
            return null;
        }
    }

    /** Read persisted state at this provider's path. */
    read(): PersistableState<S> {
        const state = get(this.readRaw(), this.path);
        logDebug(['Reading state', state], this.owner);
        return !isUndefined(state) ? new PersistableState(state) : null;
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

        const {path, debounce = 250} = persistOptions;
        throwIf(!path, 'Path not specified in PersistenceProvider.');

        this.path = path;
        this.debounce = debounce;
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
        this.defaultState = target.getPersistableState();

        const state = this.read();
        if (state) target.setPersistableState(state);

        // Direct use of MobX reaction to avoid circular dependency with HoistBase
        this.disposer = reaction(
            () => this.target.getPersistableState(),
            state => {
                if (state.equals(this.defaultState)) {
                    this.clear();
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
}
