/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {DebounceSpec, Persistable, PersistableState, XH} from '../';
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
import {logError, throwIf} from '@xh/hoist/utils/js';
import {IReactionDisposer, reaction} from 'mobx';

/**
 * Abstract superclass for adaptor objects used by models and components to (re)store state to and
 * from a persistent location, typically a Hoist preference or key within browser local storage.
 *
 * Note that multiple instances of this object may be writing into the same location.
 * Implementations should take care to incorporate any writes immediately into the readable state.
 *
 * Hoist-provided implementations include:
 *   - {@link PrefProvider} - stores state in a predefined Hoist application Preference.
 *   - {@link LocalStorageProvider} - stores state in browser local storage under a configured key.
 *   - {@link DashViewProvider} - stores state with other Dashboard-specific state via a `DashViewModel`.
 *   - {@link CustomProvider} - API for app and components to provide their own storage mechanism.
 */

export interface PersistenceProviderConfig<S> extends PersistOptions {
    target: Persistable<S>;
}

export abstract class PersistenceProvider<S> {
    get isPersistenceProvider(): boolean {
        return true;
    }

    readonly path: string;
    readonly debounce: DebounceSpec;

    protected readonly target: Persistable<S>;

    protected defaultState: PersistableState<S>;

    private disposer: IReactionDisposer;

    /**
     * Construct an instance of this class.
     * Throws if unable to perform initial read operation.
     *
     * Note:
     * - `destroy()` must be called when the provider is no longer needed.
     * - Targets should initialize their default persistable state *before* creating a
     *   `PersistenceProvider` and avoid setting up any reactions to persistable state until *after*
     */
    static create<S>({type, ...rest}: PersistenceProviderConfig<S>): PersistenceProvider<S> {
        if (!type) {
            if (rest.prefKey) type = 'pref';
            if (rest.localStorageKey) type = 'localStorage';
            if (rest.dashViewModel) type = 'dashView';
            if (rest.getData || rest.setData) type = 'custom';
        }

        let ret: PersistenceProvider<S>;

        switch (type) {
            case 'pref':
                ret = new PrefProvider(rest);
                break;
            case 'localStorage':
                ret = new LocalStorageProvider(rest);
                break;
            case `dashView`:
                ret = new DashViewProvider(rest);
                break;
            case 'custom':
                ret = new CustomProvider(rest);
                break;
            default:
                throw XH.exception(`Unknown Persistence Provider for type: ${type}`);
        }

        try {
            ret.bindToTarget();
            return ret;
        } catch (e) {
            logError(e);
            ret.destroy();
            return null;
        }
    }

    /**
     * Called by implementations only. See create.
     */
    protected constructor(config: PersistenceProviderConfig<S>) {
        const {path, debounce = 250, target} = config;
        throwIf(isUndefined(path), 'Path not specified in PersistenceProvider.');

        this.path = path;
        this.debounce = debounce;
        this.target = target;

        if (debounce) {
            this.writeInternal = isNumber(debounce)
                ? lodashDebounce(this.writeInternal, debounce)
                : lodashDebounce(this.writeInternal, debounce.interval, debounce);
        }
    }

    /**
     * Read data at a path
     */
    read(): PersistableState<S> {
        const state = get(this.readRaw(), this.path);
        return !isUndefined(state) ? new PersistableState(state) : null;
    }

    /**
     * Save data at a path
     * @param data  - data to be written to the path, must be serializable to JSON.
     */
    write(data: S) {
        this.writeInternal(data);
    }

    /**
     * Clear any state saved by this object at a path
     */
    clear(path: string = this.path) {
        const obj = cloneDeep(this.readRaw());
        unset(obj, this.path);
        this.writeRaw(obj);
    }

    /**
     * Clear *all* state held by this object.
     */
    clearAll() {
        this.clearRaw();
    }

    destroy() {
        this.disposer?.();
    }

    //----------------
    // Implementation
    //----------------
    /** Called by factory method to bind this provider to its target. */
    protected bindToTarget() {
        const {target} = this;

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
