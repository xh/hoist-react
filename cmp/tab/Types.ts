import {TabContainerModel} from '@xh/hoist/cmp/tab/TabContainerModel';
import {TabModel} from '@xh/hoist/cmp/tab/TabModel';
import {
    BoxProps,
    HoistModel,
    HoistProps,
    MenuContext,
    MenuItemLike,
    MenuToken,
    PersistOptions,
    Side
} from '@xh/hoist/core';
import {ReactElement, ReactNode} from 'react';

export interface TabContainerModelPersistOptions extends PersistOptions {
    /** True (default) to persist the active tab ID or provide custom PersistOptions. */
    persistActiveTabId?: boolean;
    /** True (default) to persist favorite tab IDs or provide custom PersistOptions. */
    persistFavoriteTabIds?: boolean;
}

export interface DynamicTabSwitcherConfig {
    /** Additional tabs to include in the switcher, such as for actions outside the TabContainer. */
    actionTabs?: ActionTabSpec[];
    /** Additional menu items to include in tab context menus. */
    extraMenuItems?: Array<MenuItemLike<MenuToken, DynamicTabSwitcherMenuContext>>; // TODO - consider making this `contextMenu` and having app-code spread the default
    /** IDs of favorite tabs to display by default (in order). */
    initialFavorites?: string[];
}

export interface DynamicTabSwitcherMenuContext extends MenuContext {
    tab: TabModel | ActionTab;
}

export interface ActionTabSpec extends ActionTab {
    /** Function called prior to showing this item. */
    displayFn?: () => Omit<ActionTabSpec, 'id' | 'actionFn'>;
}

export interface ActionTab {
    /** Unique ID for the tab. */
    id: string;
    /** Display title for the Tab. */
    title?: ReactNode;
    /** Display icon for the Tab. */
    icon?: ReactElement;
    /** Tooltip for the Tab. */
    tooltip?: ReactNode;
    /** True to disable this tab. */
    disabled?: boolean;
    /** True to omit this tab. */
    omit?: boolean;
    /** Action to be performed when the tab is selected. */
    actionFn: () => void;
}

export interface TabSwitcherProps extends HoistProps<TabContainerModel>, BoxProps {
    /** Relative position within the parent TabContainer. Defaults to 'top'. */
    orientation?: Side;

    /**
     * True to animate the indicator when switching tabs. False (default) to change instantly.
     * Not supported by DynamicTabSwitcher.
     */
    animate?: boolean;

    /**
     * Enable scrolling and place tabs that overflow into a menu. Default to false.
     * Not supported by DynamicTabSwitcher.
     */
    enableOverflow?: boolean;

    /** Width (in px) to render tabs. Only applies to horizontal orientations */
    tabWidth?: number;

    /** Minimum width (in px) to render tabs. Only applies to horizontal orientations */
    tabMinWidth?: number;

    /** Maximum width (in px) to render tabs. Only applies to horizontal orientations */
    tabMaxWidth?: number;
}

/** Cross-platform interface for desktop and mobile (TBA) DynamicTabSwitcherModels. */
export interface DynamicTabSwitcherModel extends HoistModel {
    /** IDs of favorite tabs, in order. */
    get favoriteTabIds(): string[];
    /** Tabs (including action tabs) displayed in switcher, in order. */
    get visibleTabs(): Array<TabModel | ActionTab>;
    /** Enabled tabs (including action tabs) displayed in switcher, in order. */
    get enabledVisibleTabs(): Array<TabModel | ActionTab>;
    /** Whether the specified tab is currently active in the TabContainer. */
    isTabActive(tabId: string): boolean;
    /** Whether the specified tab is currently marked as a favorite. */
    isTabFavorite(tabId: string): boolean;
    /** Toggle the favorite status of the specified tab. */
    toggleTabFavorite(tabId: string): void;
    /** Activate the specified tab in the TabContainer. */
    activate(tabId: string): void;
    /** Remove the specified tab from the switcher. */
    hide(tabId: string): void;
    /** Get the fully resolved ActionTab for the specified tabId. */
    getActionTab(tabId: string): ActionTab;
    /** Set the IDs of all favorite tabs, in order. */
    setFavoriteTabIds(tabIds: string[]): void;
}
