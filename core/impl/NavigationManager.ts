import {TabConfig, TabContainerConfig} from '@xh/hoist/cmp/tab';
import {isEmpty, isNil} from 'lodash';
import {Route} from 'router5';

export interface NavigationEntry
    extends Omit<Route, 'name' | 'children' | 'path'>,
        Omit<TabConfig, 'children'> {
    children?: NavigationEntry[];
    path?: string;
}

export class NavigationManager {
    private _navTree: NavigationEntry = null;

    setNavigationData(navTree: NavigationEntry) {
        this._navTree = navTree;
    }

    get routes(): Route[] {
        if (isNil(this._navTree)) return [];
        return [this.buildRouteFromNavigationEntry(this._navTree)];
    }

    getTabContainerConfig(props: TabContainerConfig): TabContainerConfig {
        if (isNil(this._navTree)) return null;
        return {
            route: this._navTree.id,
            ...props,
            tabs: [
                ...this._navTree.children.map(entry =>
                    this.buildTabConfigFromNavigationEntry(entry)
                ),
                ...(props?.tabs ?? [])
            ]
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
            path: path ?? `/${id}`,
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
            containerModel,
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
            containerModel,
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
