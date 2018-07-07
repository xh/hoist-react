/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, observable} from '@xh/hoist/mobx';
import {isPlainObject, uniqBy, find} from 'lodash';
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

    /** TabPaneModels included in this tab container. */
    panes = [];

    /** Base route for this container. */
    route = null

    /** Id of the pane to be active by default. */
    defaultPaneId = null;

    /** Id of the currently active pane. */
    @observable activePaneId = null;

    /** How should this container render hidden panes? */
    paneRenderMode = null;

    /**
     * @param {Object[]} panes - TabPaneModels, or configurations for TabPaneModels to be displayed by this container.
     * @param {String} [defaultPaneId] - id of 'default' pane.  If not set, will default to first pane in the provided collection.
     * @param {Object} [route] - name for Router5 route.  If set, this tab container will be route enabled,
     *      with the route for each pane being "[route]/[pane.id]".
     * @param {String} [paneRenderMode] - Method used to render hidden panes.
     *      Should be one of 'lazy'|'always'|'removeOnHide';
     */
    constructor({panes, defaultPaneId = null, route = null, paneRenderMode = 'lazy'}) {

        this.paneRenderMode = paneRenderMode;

        // 1) validate and wire panes, instantiate if needed.
        const childIds = uniqBy(panes, 'id');
        throwIf(panes.length == 0, 'TabContainerModel needs at least one child pane.');
        throwIf(panes.length != childIds.length, 'One or more Panes in TabContainer has a non-unique id.');

        panes = panes.map(p => isPlainObject(p) ? new TabPaneModel(p) : p);
        panes.forEach(p => p.container = this);
        this.panes = panes;

        // 2) Setup and activate default pane
        if (defaultPaneId == null) {
            defaultPaneId = panes[0].id;
        }
        this.activePaneId = this.defaultPaneId = defaultPaneId;

        // 3) Setup routes
        this.route = route;
        if (route) {
            this.addReaction(this.routerReaction());
        }
    }

    /**
     * The currently selected TabPanelModel.
     */
    get activePane() {
        return find(this.panes, {id: this.activePaneId});
    }

    /**
     * Set the currently active TabPane.
     * @param {int} id - unique id of tab pane to be shown.
     * @param {boolean} [suppressRouting] - For internal use.
     *      Set to true to avoid triggering routing based navigation.
     */
    @action
    setActivePaneId(id, suppressRouting = false) {
        const {route, panes} = this,
            pane = find(panes, {id});

        throwIf(!pane, `Unknown pane ${id} in TabContainer.`);

        this.activePaneId = id;
        if (pane.reloadOnShow) pane.requestRefresh();

        if (route && !suppressRouting) {
            const paneRoute = route + '.' + id;
            if (!XH.router.isActive(paneRoute)) {
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
            track: () => XH.routerState,
            run: () => {
                const {panes, route} = this,
                    {router} = XH;
                if (router.isActive(route)) {
                    const activatePane = panes.find(pane => {
                        return router.isActive(route + '.' + pane.id) && !pane.isActive;
                    });

                    if (activatePane) {
                        this.setActivePaneId(activatePane.id, true);
                    }
                }
            },
            fireImmediately: true
        };
    }
}