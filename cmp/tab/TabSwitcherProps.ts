/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {BoxProps, HoistProps, Side} from '@xh/hoist/core';
import {TabContainerModel} from './TabContainerModel';

export interface TabSwitcherProps extends HoistProps<TabContainerModel, HTMLDivElement>, BoxProps {
    /** Relative position within the parent TabContainer. Defaults to 'top'. */
    orientation?: Side;

    /** True to animate the indicator when switching tabs. False (default) to change instantly. */
    animate?: boolean;

    /** Enable scrolling and place tabs that overflow into a menu. Default to false. */
    enableOverflow?: boolean;

    /** Width (in px) to render tabs. Only applies to horizontal orientations */
    tabWidth?: number;

    /** Minimum width (in px) to render tabs. Only applies to horizontal orientations */
    tabMinWidth?: number;

    /** Maximum width (in px) to render tabs. Only applies to horizontal orientations */
    tabMaxWidth?: number;
}
