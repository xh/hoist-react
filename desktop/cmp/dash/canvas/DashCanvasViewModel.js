/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {DashViewModel} from '@xh/hoist/desktop/cmp/dash/DashViewModel';
import '@xh/hoist/desktop/register';
import {createObservableRef} from '@xh/hoist/utils/react';
import {action, makeObservable, observable} from 'mobx';

/**
 * Model for a content item within a DashCanvas.
 * @extends DashViewModel
 */
export class DashCanvasViewModel extends DashViewModel {
    /** @member {RefObject<DOMElement>} */
    ref = createObservableRef();
    /** @member {boolean} */
    @observable hidePanelHeader;
    /** @member {boolean} */
    @observable hideMenuButton;
    /** @member {Array} */
    @observable.ref headerItems = [];
    /** @member {boolean} */
    @observable autoHeight;

    constructor(cfg) {
        super(cfg);
        makeObservable(this);
        this.hidePanelHeader = !!cfg.viewSpec.hidePanelHeader;
        this.hideMenuButton = !!cfg.viewSpec.hideMenuButton;
        this.autoHeight = !!cfg.viewSpec.autoHeight;
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
     * @param {ReactNode[]} items
     */
    @action
    setHeaderItems(items) {
        this.headerItems = items;
    }

    //------------------------
    // Implementation
    //------------------------

    onContentsResized({height}) {
        if (!this.autoHeight || this.containerModel.isResizing) return;

        const {id, containerModel} = this,
            {rowHeight, margin} = containerModel,
            viewLayout = containerModel.getViewLayout(id),
            HEADER_HEIGHT = 23;

        // Calculate new height in grid units
        const h = Math.round((height + HEADER_HEIGHT + margin[1]) / (rowHeight + margin[1]));
        if (h === viewLayout.h) return;

        // Send the new layout back to the parent model
        containerModel.setViewLayout({...viewLayout, h});
    }
}
