/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {Content, Thunkable} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {ReactElement} from 'react';

/**
 * Spec used to generate DashViews and DashViewModels within a DashContainer or DashCanvas.
 *
 * This is a base interface for {@link DashContainerViewSpec} and {@link DashCanvasViewSpec}
 */
export interface DashViewSpec {
    /** Unique identifier of the DashViewSpec. */
    id: string;

    /** Content to be rendered by this DashView. */
    content: Content;

    /** Title text added to the tab header. */
    title?: string;

    /** An icon placed at the left-side of the tab header. */
    icon?: ReactElement;

    /**
     * Group name to display within the add view component. The default context menu will
     * automatically group its available views if provided.
     */
    groupName?: string;

    /**
     * True to prevent any instances of this view. References to this view in state will
     * be quietly dropped. Default false.
     */
    omit?: Thunkable<boolean>;

    /** True to prevent multiple instances of this view. Default false. */
    unique?: boolean;

    /**
     * True (default) to allow adding new instances of this view. References to this view in
     * state will be respected.
     */
    allowAdd?: boolean;

    /** True (default) to allow removing instances from the DashContainer. */
    allowRemove?: boolean;

    /** True (default) to allow renaming the view. */
    allowRename?: boolean;

    /** Additional properties to store on the DashView */
    [x: string]: any;
}
