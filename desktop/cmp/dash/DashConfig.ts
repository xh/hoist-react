/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {MenuItemLike, PersistOptions} from '@xh/hoist/core';
import {DashViewState} from '@xh/hoist/desktop/cmp/dash/DashViewModel';
import {DashViewSpec} from '@xh/hoist/desktop/cmp/dash/DashViewSpec';

/**
 * Base interface for {@link DashCanvasConfig} and {@link DashContainerConfig}.
 */
export interface DashConfig<VSPEC extends DashViewSpec, VSTATE extends DashViewState> {
    /**
     * A collection of viewSpecs, each describing a type of view that can be displayed in this
     * container.
     */
    viewSpecs: VSPEC[];

    /** Properties to be set on all viewSpecs.  Merges deeply. */
    viewSpecDefaults?: Partial<VSPEC>;

    /** Default layout state for this container.*/
    initialState?: VSTATE[];

    /** Prevent re-arranging views by dragging and dropping.*/
    layoutLocked?: boolean;

    /** Prevent adding and removing views. */
    contentLocked?: boolean;

    /** Prevent renaming views. */
    renameLocked?: boolean;

    /** Options governing persistence. */
    persistWith?: PersistOptions;

    /** Text to display when the container is empty. */
    emptyText?: string;

    /** Text to display on the add view button. */
    addViewButtonText?: string;

    /**
     * Array of RecordActions, configs or token strings, with which to create additional dash
     * context menu items. Extra menu items will appear in the menu section below the 'Add' action,
     * including when the dash container is empty.
     */
    extraMenuItems?: MenuItemLike[];
}
