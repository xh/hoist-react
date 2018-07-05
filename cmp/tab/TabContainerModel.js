/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {isPlainObject, startCase, uniqBy, find} from 'lodash';
import {throwIf} from '@xh/hoist/utils/JsUtils';
import {TabPaneModel} from '@xh/hoist/cmp/tab';

/**
 * Model for a TabContainer, representing its layout/contents and the currently selected child.
 *
 * This TabContainer also supports managed loading and refreshing of its TabPanes.  In particular,
 * TabPanes will be lazily rendered and loaded and will be refreshed whenever the TabPane is shown.
 *
 * @see TabPaneModel
 */
@HoistModel()
export class TabContainerModel {
    id = null;
    name = null;
    useRoutes = false;

    panes = []; // TabPaneModels included in this tab container
    @observable activeId = null;

    /**
     * @param {string} id - unique ID, used for generating routes.
     * @param {string} [name] - display name for this container - useful in particular when displaying
     *      nested tabs, where this model's container is a direct child of a parent TabContainer.
     * @param {boolean} [useRoutes] - true to use routes for navigation.
     *      These routes must be setup externally in the application (@see BaseApp.getRoutes()).
     *      They may exist at any level of the application, but there must be a route of the form
     *      `/../../[containerId]/[childPaneId]` for each child pane in this container.
     * @param {Object[]} panes - TabPaneModels, or configurations for TabPaneModels representing content to be shown.
     */
    constructor({
        id,
        name = startCase(id),
        useRoutes = false,
        panes
    }) {
        this.id = id;
        this.name = name;
        this.useRoutes = useRoutes;

        // Instantiate pane configs, if needed.
        panes = panes.map(p => isPlainObject(p) ? new TabPaneModel(p) : p);
        panes.forEach(p => p.container = this);

        // Validate and wire children
        throwIf(panes.length == 0,
            'TabContainerModel needs at least one child pane.'
        );
        throwIf(panes.length != uniqBy(panes, 'id').length,
            'One or more Panes in TabContainerModel has a non-unique id.'
        );

        this.panes = panes;
        this.activeId = panes[0].id;
    }

    /**
     * The currently selected TabPanelModel.
     */
    get activePane() {
        return find(this.panes, {id: this.activeId});
    }

    /**
     * Set the currently active TabPane.
     * @param {int} id - unique id of tab pane to be shown.
     */
    @action
    setActiveId(id) {
        const {useRoutes, panes} = this,
            pane = find(panes, {id});

        if (!pane) return;

        this.activeId = id;
        if (pane.reloadOnShow) pane.requestRefresh();

        if (useRoutes) {
            const routerModel = XH.routerModel,
                state = routerModel.currentState,
                routeName = state ? state.name : 'default',
                selectedRouteFragment = this.routeName + '.' + id;

            if (!routeName.startsWith(selectedRouteFragment)) {
                routerModel.navigate(selectedRouteFragment);
            }
        }
    }


    /**
     * Require a refresh of all panes when they are next shown.
     * Immediately refresh active pane.
     */
    requestRefresh() {
        this.panes.forEach(it => it.requestRefresh());
    }


    //-------------------------
    // Implementation
    //-------------------------
    destroy() {
        XH.safeDestroy(this.panes);
    }
}