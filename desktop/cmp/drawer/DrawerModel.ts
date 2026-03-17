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
    PersistOptions
} from '@xh/hoist/core';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isNil} from 'lodash';

/** Display modes for a Drawer. */
export type DrawerMode = 'overlay' | 'pinned' | 'collapsed';

export interface DrawerModelConfig {
    /**
     * Modes this drawer supports. Determines which display states are available.
     * Default: ['overlay'].
     */
    supportedModes?: DrawerMode[];

    /** Starting mode. Default: first entry in `supportedModes`. */
    defaultMode?: DrawerMode;

    /** Width when pinned (for left/right drawers). Default: 300. */
    size?: number | string;

    /** Options governing persistence of the drawer's mode. */
    persistWith?: PersistOptions;
}

export interface DrawerPersistState {
    mode?: DrawerMode;
}

/**
 * Model for managing the display state of a Drawer component. Tracks the current display mode
 * (overlay, pinned, or collapsed) and the transient overlay open/close state.
 *
 * Typically created automatically by the Drawer component from its props, but can also be created
 * explicitly for programmatic control or persistence.
 */
export class DrawerModel extends HoistModel implements Persistable<DrawerPersistState> {
    declare config: DrawerModelConfig;

    //-----------------------
    // Immutable Properties
    //-----------------------
    readonly supportedModes: DrawerMode[];
    readonly defaultMode: DrawerMode;
    readonly size: number | string;

    //---------------------
    // Observable State
    //---------------------
    @observable mode: DrawerMode;
    @observable isOverlayOpen: boolean = false;

    //---------------------
    // Computed
    //---------------------
    @computed
    get isPinned(): boolean {
        return this.mode === 'pinned';
    }

    @computed
    get isCollapsed(): boolean {
        return this.mode === 'collapsed';
    }

    @computed
    get isOverlay(): boolean {
        return this.mode === 'overlay';
    }

    constructor({
        supportedModes = ['overlay'],
        defaultMode = null,
        size = 300,
        persistWith = null
    }: DrawerModelConfig = {}) {
        super();
        makeObservable(this);

        throwIf(!supportedModes?.length, 'DrawerModel requires at least one supported mode.');

        this.supportedModes = supportedModes;
        this.defaultMode = defaultMode ?? supportedModes[0];

        throwIf(
            !supportedModes.includes(this.defaultMode),
            `Default mode '${this.defaultMode}' is not in supportedModes.`
        );

        this.mode = this.defaultMode;
        this.size = size;

        if (persistWith) {
            PersistenceProvider.create({
                persistOptions: {path: 'drawer', ...persistWith},
                target: this
            });
        }
    }

    //----------------------
    // Actions
    //----------------------
    @action
    setMode(mode: DrawerMode) {
        throwIf(
            !this.supportedModes.includes(mode),
            `Mode '${mode}' is not supported by this drawer. Supported: ${this.supportedModes.join(', ')}.`
        );
        this.mode = mode;
        if (mode !== 'overlay') this.isOverlayOpen = false;
    }

    /** Cycle to the next supported mode. */
    @action
    cycleMode() {
        const {supportedModes, mode} = this,
            idx = supportedModes.indexOf(mode),
            nextIdx = (idx + 1) % supportedModes.length;
        this.setMode(supportedModes[nextIdx]);
    }

    /** Shorthand for `setMode('pinned')`. */
    pin() {
        this.setMode('pinned');
    }

    /** Shorthand for `setMode('collapsed')`. */
    collapse() {
        this.setMode('collapsed');
    }

    @action
    openOverlay() {
        if (this.isPinned) return;
        this.isOverlayOpen = true;
    }

    @action
    closeOverlay() {
        this.isOverlayOpen = false;
    }

    @action
    toggleOverlay() {
        if (this.isPinned) return;
        this.isOverlayOpen = !this.isOverlayOpen;
    }

    //---------------------
    // Persistable Interface
    //---------------------
    getPersistableState(): PersistableState<DrawerPersistState> {
        return new PersistableState({mode: this.mode});
    }

    setPersistableState(state: PersistableState<DrawerPersistState>) {
        const {mode} = state.value;
        if (!isNil(mode) && this.supportedModes.includes(mode)) {
            this.mode = mode;
        }
    }
}
