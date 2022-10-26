/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {DashViewSpec} from '@xh/hoist/desktop/cmp/dash/DashViewSpec';
import '@xh/hoist/desktop/register';

/**
 * Spec used to generate DashCanvasViews and DashCanvasViewModels within a {@link DashCanvas}.
 *
 * This class is not typically created directly within applications. Instead, specify as plain
 * object configs via the `DashCanvasModel.viewSpecs` constructor config.
 */
export interface DashCanvasViewSpec extends DashViewSpec {

    /** Initial height of view when added to canvas (default 5). */
    height?: number;

    /** Initial width of view when added to canvas (default 5). */
    width?: number

    /** True to hide the panel header (default false). */
    hidePanelHeader?: boolean;

    /** True to hide the panel header menu button (default false). */
    hideMenuButton?: boolean;

    /** True to set height automatically based on content height (default false). */
    autoHeight?: boolean;
}
