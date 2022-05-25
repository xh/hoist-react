/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {DashViewModel} from '@xh/hoist/desktop/cmp/dash/DashViewModel';
import {createObservableRef} from '@xh/hoist/utils/react';
import {action, makeObservable, observable} from 'mobx';

/**
 * Model for a content item within a DashCanvas. Extends {@see DashViewModel}
 *
 * ---------- !! NOTE: THIS COMPONENT IS CURRENTLY IN BETA !! ----------
 * -- Model API is under development and subject to breaking changes --
 *
 * @Beta
 */
export class DashCanvasViewModel extends DashViewModel {
    /** @member {RefObject<DOMElement>} */
    ref = createObservableRef();
    /** @member {boolean} */
    @observable hidePanelHeader;
    /** @member {boolean} */
    @observable hideMenuButton;
    /** @member {Array} */
    @observable.ref headerItems;
    /** @member {Array} */
    @observable.ref extraMenuItems;

    constructor(cfg) {
        super(cfg);
        makeObservable(this);
        this.hidePanelHeader = !!cfg.viewSpec.hidePanelHeader;
        this.hideMenuButton = !!cfg.viewSpec.hideMenuButton;
        this.headerItems = cfg.viewSpec.headerItems;
        this.extraMenuItems = cfg.viewSpec.extraMenuItems;
    }

    get positionParams() {
        const {containerModel, id} = this;
        return containerModel.layout.find(view => view.i === id);
    }

    /** Scrolls the DashCanvasView into view */
    ensureVisible() {
        const {ref} = this;
        this.addReaction({
            when: () => ref.current,
            run: () => ref.current.scrollIntoView({behavior: 'smooth', block: 'nearest'})
        });
    }

    /**
     * Specify array of items to be added to the right-side of the panel header
     * @param {Array} items
     */
    @action
    setHeaderItems(items) {
        this.headerItems = items;
    }

    /**
     * Specify array with which to create additional panel menu items
     * @param {Array} items
     */
    @action
    setExtraMenuItems(items) {
        this.extraMenuItems = items;
    }
}
