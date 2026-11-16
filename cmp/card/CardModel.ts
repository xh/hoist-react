/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import type {Persistable, PersistOptions, RenderMode} from '@xh/hoist/core';
import {HoistModel, PersistableState, PersistenceProvider, persistOptions} from '@xh/hoist/core';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';
import {action, bindable, observable} from '@xh/hoist/mobx';

/**
 * Configuration for a {@link CardModel}. A CardModel is created automatically by {@link Card}
 * when not provided explicitly - pass a config via the Card's `model` prop to customize.
 *
 * @see CardModel
 * @see Card
 */
export interface CardModelConfig {
    /** Can card be collapsed? Change it later with {@link CardModel.collapsible}. */
    collapsible?: boolean;

    /** Default collapsed state. */
    defaultCollapsed?: boolean;

    /** How should collapsed content be rendered? */
    renderMode?: RenderMode;

    /** Options governing persistence. */
    persistWith?: PersistOptions;
}

export interface CardPersistState {
    collapsed?: boolean;
}

/**
 * Model for a {@link Card} - manages collapsible state and render mode for the Card's content.
 * Created automatically by Card when not provided - pass via the Card's `model` prop to
 * customize collapsibility, default state, or persistence.
 *
 * Also serves as the base class for {@link FormFieldSetModel}.
 *
 * @see CardModelConfig
 * @see Card
 */
export class CardModel extends HoistModel implements Persistable<CardPersistState> {
    declare config: CardModelConfig;

    //-----------------------
    // Immutable Properties
    //-----------------------
    readonly defaultCollapsed: boolean;
    readonly renderMode: RenderMode;

    //---------------------
    // Observable State
    //---------------------
    /**
     * Can card be collapsed? Set false to remove the collapse control from the header, which also
     * expands a collapsed card. Set true to add it. The card then returns to the collapsed state
     * it last had while collapsible, or to its persisted state, and is otherwise left expanded.
     * (observable)
     */
    @bindable accessor collapsible: boolean = false;

    @observable accessor collapsed: boolean = false;

    /** The collapsed state to return to once the card can collapse. Null when there is none. */
    @observable private accessor heldCollapsed: boolean = null;

    constructor({
        collapsible = false,
        defaultCollapsed = false,
        renderMode = 'unmountOnHide',
        persistWith = null
    }: CardModelConfig = {}) {
        super();

        this.collapsible = collapsible;
        this.collapsed = this.defaultCollapsed = collapsible && defaultCollapsed;
        this.renderMode = renderMode;

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: persistOptions({path: 'card'}, persistWith),
                target: this
            });
        }

        this.addReaction({
            track: () => this.collapsible,
            run: collapsible => this.onCollapsibleChange(collapsible)
        });
    }

    //----------------------
    // Actions + public setters
    //----------------------
    @action
    setCollapsed(collapsed: boolean) {
        throwIf(collapsed && !this.collapsible, 'Card does not support collapsing.');
        this.collapsed = collapsed;
    }

    //---------------------
    // Persistable Interface
    //---------------------
    getPersistableState(): PersistableState<CardPersistState> {
        const ret: CardPersistState = {},
            collapsed = this.collapsible ? this.collapsed : this.heldCollapsed;
        if (!isNil(collapsed)) ret.collapsed = collapsed;
        return new PersistableState(ret);
    }

    setPersistableState(state: PersistableState<CardPersistState>) {
        const {collapsed} = state.value;
        if (isNil(collapsed)) return;
        if (this.collapsible) {
            this.collapsed = collapsed;
        } else {
            this.heldCollapsed = collapsed;
        }
    }

    //------------------
    // Implementation
    //------------------
    /**
     * A card that cannot collapse shows expanded, but holds its collapsed state rather than drop
     * it. The persisted state therefore survives a model that becomes collapsible only after
     * construction, or that stops being collapsible for a time.
     */
    @action
    private onCollapsibleChange(collapsible: boolean) {
        if (collapsible) {
            if (!isNil(this.heldCollapsed)) this.collapsed = this.heldCollapsed;
            this.heldCollapsed = null;
        } else {
            this.heldCollapsed = this.collapsed;
            this.collapsed = false;
        }
    }
}
