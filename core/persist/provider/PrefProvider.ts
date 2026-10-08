/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core/';
import {compareStructural, IReactionDisposer, reaction, runInAction} from '@xh/hoist/mobx';
import {logError, throwIf} from '@xh/hoist/utils/js';
import {get} from 'lodash';
import type {Persistable} from '../Persistable';
import {PersistenceProvider, PersistenceProviderConfig} from '../PersistenceProvider';

/**
 * PersistenceProvider that stores state within the Hoist Preferences system.
 *
 * Changes made to the preference by other code - e.g. a reset via `XH.prefService.unset()` - are
 * pushed to the target. Writes from PrefProviders are not, so that targets sharing a preference
 * do not feed state back and forth.
 */
export class PrefProvider<S> extends PersistenceProvider<S> {
    readonly key: string;

    /** Pref value produced by the latest PrefProvider write, by pref key. */
    private static lastWrites = new Map<string, unknown>();
    private prefDisposer: IReactionDisposer;

    constructor(cfg: PersistenceProviderConfig<S>) {
        super(cfg);
        const {prefKey} = cfg.persistOptions;
        throwIf(!prefKey, `PrefProvider requires a 'prefKey'.`);
        this.key = prefKey;
    }

    override destroy() {
        this.prefDisposer?.();
        super.destroy();
    }

    //----------------
    // Implementation
    //----------------
    protected override bindToTarget(target: Persistable<S>) {
        super.bindToTarget(target);
        this.prefDisposer = reaction(
            () => get(this.readRaw(), this.path),
            () => this.syncTargetToPref(),
            {equals: compareStructural}
        );
    }

    override readRaw() {
        return XH.prefService.get(this.key);
    }

    override writeRaw(data) {
        // One action, so that reactions to the change run only once the write is recorded.
        runInAction(() => {
            XH.prefService.set(this.key, data);
            PrefProvider.lastWrites.set(this.key, this.readRaw());
        });
    }

    private syncTargetToPref() {
        // `set()` stores a fresh copy, held by the pref until other code changes it.
        if (this.readRaw() === PrefProvider.lastWrites.get(this.key)) return;

        // Compare from the target's state, which may define its own equality - e.g. grid columns.
        const {target} = this,
            state = this.read() ?? this.defaultState;
        if (target.getPersistableState().equals(state)) return;

        try {
            target.setPersistableState(state);
        } catch (e) {
            logError(e, this.owner);
        }
    }
}
