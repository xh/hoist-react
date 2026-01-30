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

export interface CardModelConfig {
    /** Can card be collapsed? */
    collapsible?: boolean;

    /** Default collapsed state. */
    defaultCollapsed?: boolean;

    /** How should collapsed content be rendered? */
    renderMode?: RenderMode;

    /** Options governing persistence. */
    persistWith?: PersistOptions;
}

export interface CardPersistState {
    collapsed: boolean;
}

/**
 * CardModel supports configuration and state-management for user-driven expand/collapse,
 * along with support for saving this state via a configured PersistenceProvider.
 */
export class CardModel extends HoistModel implements Persistable<CardPersistState> {
    declare config: CardModelConfig;

    //-----------------------
    // Immutable Properties
    //-----------------------
    readonly collapsible: boolean;
    readonly defaultCollapsed: boolean;
    readonly renderMode: RenderMode;

    //---------------------
    // Observable State
    //---------------------
    @bindable
    collapsed: boolean = false;

    constructor({
        collapsible = true,
        defaultCollapsed = false,
        renderMode = 'unmountOnHide',
        persistWith = null
    }: CardModelConfig = {}) {
        super();
        makeObservable(this);

        this.collapsible = collapsible;
        this.collapsed = this.defaultCollapsed = collapsible && defaultCollapsed;
        this.renderMode = renderMode;

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {
                    path: 'card',
                    ...persistWith
                },
                target: this
            });
        }
    }

    //---------------------
    // Persistable Interface
    //---------------------
    getPersistableState(): PersistableState<CardPersistState> {
        return new PersistableState({collapsed: this.collapsed});
    }

    setPersistableState(state: PersistableState<CardPersistState>) {
        const {collapsed} = state.value;
        if (!isNil(collapsed)) {
            this.collapsed = collapsed;
        }
    }
}
