/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {
    HoistModel,
    Persistable,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    RenderMode
} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';
import {isNil} from 'lodash';

export interface CollapsibleSetConfig {
    /** Default collapsed state. */
    defaultCollapsed?: boolean;

    /** How should collapsed content be rendered? */
    renderMode?: RenderMode;

    /** Options governing persistence. */
    persistWith?: PersistOptions;
}

export interface CollapsibleSetPersistState {
    collapsed: boolean;
}

/**
 * CollapsibleSetModel supports configuration and state-management for user-driven expand/collapse,
 * along with support for saving this state via a configured PersistenceProvider.
 */
export class CollapsibleSetModel
    extends HoistModel
    implements Persistable<CollapsibleSetPersistState>
{
    declare config: CollapsibleSetConfig;

    //-----------------------
    // Immutable Properties
    //-----------------------
    readonly defaultCollapsed: boolean;
    readonly renderMode: RenderMode;

    //---------------------
    // Observable State
    //---------------------
    @bindable
    collapsed: boolean = false;

    constructor({
        defaultCollapsed = false,
        renderMode = 'unmountOnHide',
        persistWith = null
    }: CollapsibleSetConfig = {}) {
        super();
        makeObservable(this);

        this.collapsed = this.defaultCollapsed = defaultCollapsed;
        this.renderMode = renderMode;
        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'collapsibleSet',
                    ...persistWith
                },
                target: this
            });
        }
    }

    //---------------------
    // Persistable Interface
    //---------------------
    getPersistableState(): PersistableState<CollapsibleSetPersistState> {
        return new PersistableState({collapsed: this.collapsed});
    }

    setPersistableState(state: PersistableState<CollapsibleSetPersistState>) {
        const {collapsed} = state.value;
        if (!isNil(collapsed)) {
            this.collapsed = collapsed;
        }
    }
}
