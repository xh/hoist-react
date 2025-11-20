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

export interface TabContainerModelPersistOptions extends PersistOptions {
    /** True (default) to persist the active tab ID or provide custom PersistOptions. */
    persistActiveTabId?: boolean;
    /** True (default) to persist favorite tab IDs or provide custom PersistOptions. */
    persistFavoriteTabIds?: boolean;
}

export interface DynamicTabSwitcherConfig {
    /** Additional menu items to include in tab context menus. */
    extraMenuItems?: Array<MenuItemLike<MenuToken, DynamicTabSwitcherMenuContext>>; // TODO - consider making this `contextMenu` and having app-code spread the default
    /** IDs of favorite tabs to display by default (in order). */
    initialFavorites?: string[];
}

export interface DynamicTabSwitcherMenuContext extends MenuContext {
    tab: TabModel;
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
    /** Tabs displayed in switcher, in order. */
    get visibleTabs(): TabModel[];
    /** Enabled tabs displayed in switcher, in order. */
    get enabledVisibleTabs(): TabModel[];
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
    /** Set the IDs of all favorite tabs, in order. */
    setFavoriteTabIds(tabIds: string[]): void;
}
