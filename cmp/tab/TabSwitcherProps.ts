import {BoxProps, Side} from '@xh/hoist/core';
import {TabContainerModel} from './TabContainerModel';

export interface TabSwitcherProps extends BoxProps<TabContainerModel> {

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