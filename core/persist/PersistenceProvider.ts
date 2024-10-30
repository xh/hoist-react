/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {DebounceSpec, HoistBase, Persistable, PersistableState, XH} from '../';
import {
    LocalStorageProvider,
    PrefProvider,
    DashViewProvider,
    CustomProvider,
    PersistOptions
} from './';
import {
    cloneDeep,
    isUndefined,
    get,
    set,
    unset,
    isNumber,
    debounce as lodashDebounce
} from 'lodash';
import {logDebug, logError, throwIf} from '@xh/hoist/utils/js';
import {IReactionDisposer, reaction} from 'mobx';

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
 *   - {@link DashViewProvider} - stores state with other Dashboard-specific state via a `DashViewModel`.
 *   - {@link CustomProvider} - API for app and components to provide their own storage mechanism.
 */

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

    /**
     * Read persisted data at a path
     */
    read(): PersistableState<S> {
        logDebug('Reading persisted state', this.owner);
        const state = get(this.readRaw(), this.path);
        return !isUndefined(state) ? new PersistableState(state) : null;
    }

    /**
     * Persist data to a path.
     * @param data  - data to be written to the path, must be JSON serializable.
     */
    write(data: S) {
        logDebug('Persisting state', this.owner);
        this.writeInternal(data);
    }

    /** Clear any persisted data at a path. */
    clear(path: string = this.path) {
        logDebug('Clearing persisted state', this.owner);
        const obj = cloneDeep(this.readRaw());
        unset(obj, this.path);
        this.writeRaw(obj);
    }

    /** Clear *all* persisted data managed by this provider. */
    clearAll() {
        this.clearRaw();
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
    protected clearRaw() {}
}
