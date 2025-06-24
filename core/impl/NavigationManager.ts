import {TabConfig, TabContainerConfig, TabSwitcherProps} from '@xh/hoist/cmp/tab';
import {Content, RefreshMode, RenderMode, Thunkable} from '@xh/hoist/core';
import {isEmpty, isNil} from 'lodash';
import {ReactElement, ReactNode} from 'react';
import {Route} from 'router5';
import {Params} from 'router5/types/types/base';
import {ActivationFnFactory} from 'router5/types/types/router';

export interface NavigationEntry {
    /** Unique ID, used by container for locating tabs and generating routes. */
    id: string;

    /** Path as it will appear in url for this tab when routing. */
    path?: string;

    /** Display title for the tab. */
    title?: ReactNode;

    /** Display icon for the tab. */
    icon?: ReactElement;

    /** Tooltip for the tab. */
    tooltip?: ReactNode;

    /** True to disable this tab and block routing. */
    disabled?: boolean;

    /**
     * True to hide this Tab in the TabSwitcher, but still be able to activate the tab manually
     * or via routing.
     */
    excludeFromSwitcher?: boolean;

    /** Display an affordance to allow the user to remove this tab from its container.*/
    showRemoveAction?: boolean;

    /** Item to be rendered by this tab.*/
    content?: Content;

    /**
     * Strategy for rendering this tab. If null, will default to its container's mode. See enum
     * for description of supported modes.
     */
    renderMode?: RenderMode;

    /**
     * Strategy for refreshing this tab. If null, will default to its container's mode. See enum
     * for description of supported modes.
     */
    refreshMode?: RefreshMode;

    /** True to skip this tab.  */
    omit?: Thunkable<boolean>;

    /** @internal */
    xhImpl?: boolean;

    /** Routing properties. */
    canActivate?: ActivationFnFactory;
    forwardTo?: string;
    encodeParams?(stateParams: Params): Params;
    decodeParams?(pathParams: Params): Params;
    defaultParams?: Params;

    /** Switcher props to specify how to navigate present child tabs. */
    switcher?: boolean | TabSwitcherProps;

    /** Child navigation entry specs. */
    children?: NavigationEntry[];
}

export class NavigationManager {
    private readonly navTreeRoot: NavigationEntry = null;

    constructor(navTreeRoot: NavigationEntry) {
        this.navTreeRoot = navTreeRoot;
    }

    get isEnabled() {
        return !!this.navTreeRoot;
    }

    get routes(): Route[] {
        if (isNil(this.navTreeRoot)) return [];
        return [this.buildRouteFromNavigationEntry(this.navTreeRoot)];
    }

    get tabContainerConfig(): TabContainerConfig {
        if (isNil(this.navTreeRoot)) return null;
        return {
            route: this.navTreeRoot.id,
            tabs: this.navTreeRoot.children.map(entry =>
                this.buildTabConfigFromNavigationEntry(entry)
            )
        };
    }

    private buildRouteFromNavigationEntry(entry: NavigationEntry): Route {
        const {
            id,
            path,
            canActivate,
            forwardTo,
            children,
            encodeParams,
            decodeParams,
            defaultParams
        } = entry;

        return {
            name: id,
            // If path not manually specified, set to id in kabob-case.
            path: path ?? `/${id.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()}`,
            canActivate,
            forwardTo,
            encodeParams,
            decodeParams,
            defaultParams,
            children: children?.map(entry => this.buildRouteFromNavigationEntry(entry))
        };
    }

    private buildTabConfigFromNavigationEntry(entry: NavigationEntry): TabConfig {
        if ((!entry.children || isEmpty(entry.children)) && !entry.content) return null;
        const {
            id,
            title,
            icon,
            tooltip,
            disabled,
            excludeFromSwitcher,
            showRemoveAction,
            content,
            renderMode,
            refreshMode,
            omit,
            xhImpl,
            children,
            switcher
        } = entry;
        return {
            id,
            title,
            icon,
            tooltip,
            disabled,
            excludeFromSwitcher,
            showRemoveAction,
            content,
            renderMode,
            refreshMode,
            omit,
            xhImpl,
            switcher,
            children: children
                ?.map(entry => this.buildTabConfigFromNavigationEntry(entry))
                .filter(child => !isNil(child))
        };
    }
}
