/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {isPlainObject, startCase, uniqBy, find, each} from 'lodash';
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

    /**
     * TabPaneModels included in this tab container.
     */
    panes = [];

    /**
     * Base route for this container.
     */
    routeName = null
    @observable activeId = null;

    /**
     * @param {string} [routeName] - if set, this tab container will be route enabled, with the route for each tab being
     *      "routeName/[paneId]".  These routes must be setup externally in the application (@see BaseApp.getRoutes()).
     *      and there must be one such route for each tab pane.
     * @param {Object[]} panes - TabPaneModels, or configurations for TabPaneModels to be displayed by this container.
     */
    constructor({
        routeName = null,
        panes
    }) {
        this.routeName = routeName;

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

        if (routeName) {
            this.addReaction(this.routerReaction()) ;
        }
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
        const {routeName, panes} = this,
            pane = find(panes, {id});

        if (!pane) return;

        this.activeId = id;
        if (pane.reloadOnShow) pane.requestRefresh();

        if (routeName) {
            const {routerModel} = XH,
                state = routerModel.currentState,
                currRoute = state ? state.name : 'default',
                paneRoute = routeName + '.' + id;

            if (!currRoute.startsWith(paneRoute)) {
                XH.navigate(paneRoute);
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

    routerReaction() {
       return {
            track: () => XH.routerModel.currentState,
            run: (state) => {
                const currRoute = state ? state.name : 'default',
                    {activeId, panes, routeName} = this,
                    activatePane = panes.find(pane => {
                        const paneId = pane.id,
                            paneRoute = routeName + '.' + paneId;
                        return (currRoute.startsWith(paneRoute) && activeId !== paneId)
                    });
                if (activatePane) {
                    this.setActiveId(activatePane.id);
                }
            },
           fireImmediately: true
        };
    }
}