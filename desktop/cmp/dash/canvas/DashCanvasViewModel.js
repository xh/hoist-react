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

    // Implementation properties:
    /** @member {boolean} */
    isAutoSizing = false;


    constructor(cfg) {
        super(cfg);
        makeObservable(this);
        this.hidePanelHeader = !!cfg.viewSpec.hidePanelHeader;
        this.hideMenuButton = !!cfg.viewSpec.hideMenuButton;
        this.autoHeight = !!cfg.viewSpec.autoHeight;

        this.addReaction(this.autoHeightReaction());
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
        if (!this.autoHeight) return;

        try {
            const {id, containerModel} = this,
                {rowHeight, margin} = containerModel,
                newLayout = {...containerModel.getViewLayout(id)},
                HEADER_HEIGHT = 24;

            // Calculate new height in grid units
            newLayout.h = Math.ceil((height + HEADER_HEIGHT + margin[1]) / (rowHeight + margin[1]));

            // Send the new layout back to the parent model
            this.isAutoSizing = true;
            containerModel.setViewLayout(newLayout);
        } finally {
            this.isAutoSizing = false;
        }
    }

    autoHeightReaction() {
        return {
            track: () => this.autoHeight,
            run: autoHeight => {
                const {id, containerModel} = this,
                    newLayout = {...containerModel.getViewLayout(id)};

                newLayout.resizeHandles = autoHeight ? ['e'] : ['e', 's', 'se'];

                containerModel.setViewLayout(newLayout);
            },
            fireImmediately: true
        };
    }
}
