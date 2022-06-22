/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {DashViewModel} from '@xh/hoist/desktop/cmp/dash/DashViewModel';
import {debounced} from '@xh/hoist/utils/js';
import {createObservableRef} from '@xh/hoist/utils/react';
import {action, makeObservable, observable} from 'mobx';
import {uniqBy} from 'lodash';

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
    @observable.ref headerItems = [];
    /** @member {boolean} */
    @observable autoHeight;
    /** @member {MutationObserver} */
    mutationObserver;

    constructor(cfg) {
        super(cfg);
        makeObservable(this);
        this.hidePanelHeader = !!cfg.viewSpec.hidePanelHeader;
        this.hideMenuButton = !!cfg.viewSpec.hideMenuButton;
        this.autoHeight = !!cfg.viewSpec.autoHeight;

        this.addReaction({
            track: () => [this.ref.current, this.autoHeight],
            run: ([node, autoHeight]) => {
                if (autoHeight && node) {
                    this.mutationObserver = new window.MutationObserver(() => this.autoSizeHeight());
                    this.mutationObserver.observe(node.parentElement,
                        {
                            attributes: true,
                            attributeFilter: ['style'],
                            subtree: true
                        }
                    );
                } else {
                    this.mutationObserver?.disconnect();
                }
            }
        });
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
     * Auto-size view height to fit its contents
     */
    @debounced(100)
    autoSizeHeight() {
        const node = this.ref.current?.parentElement;

        if (!node) return;

        const {id, containerModel} = this,
            {layout, rowHeight, margin} = containerModel,
            newLayout = {...containerModel.getLayout(id)};

        // Hold on to initial height:
        const initHeight = node.style.height;

        // Set height to 'auto' to leverage some CSS magic
        node.style.height = 'auto';

        // Calculate new height in grid units
        const newHeightPx = node.offsetHeight;
        newLayout.h = Math.ceil((newHeightPx + margin[1]) / (rowHeight + margin[1]));

        // Set CSS height back to initial value (best to let ReactGridLayout mutate this directly)
        node.style.height = initHeight;

        // Send the new layout back to the parent model
        containerModel.setLayout(uniqBy([newLayout, ...layout], 'i'));
    }

    /**
     * Specify array of items to be added to the right-side of the panel header
     * @param {ReactNode[]} items
     */
    @action
    setHeaderItems(items) {
        this.headerItems = items;
    }

    destroy() {
        this.mutationObserver?.disconnect();
        super.destroy();
    }
}
