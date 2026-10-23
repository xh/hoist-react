/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {MenuItemLike, PersistOptions} from '@xh/hoist/core';
import {DashViewState} from '@xh/hoist/desktop/cmp/dash/DashViewModel';
import {DashViewSpec} from '@xh/hoist/desktop/cmp/dash/DashViewSpec';
import {SetOptional} from 'type-fest';

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
    initialState?: SetOptional<VSTATE, 'id'>[];

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
     * Minimum count of view specs that a menu for adding or replacing views must list, across its
     * nested groups, to show a filter atop it. Set 0 to always show the filter. Defaults to 20 -
     * see `DashContainerModel.defaults` and `DashCanvasModel.defaults`.
     */
    addViewFilterThreshold?: number;

    /**
     * Array of RecordActions, configs or token strings, with which to create additional dash
     * context menu items. Extra menu items will appear in the menu section below the 'Add' action,
     * including when the dash container is empty.
     */
    extraMenuItems?: MenuItemLike[];

    /** See {@link HoistBase.xhName}. */
    xhName?: string;
}
