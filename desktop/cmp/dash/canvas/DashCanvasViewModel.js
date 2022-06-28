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
    /** @member {MutationObserver} */
    mutationObserver;
    /** @member {ResizeObserver} */
    resizeObserver;

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
     * Auto-size view height to fit its contents
     */
    @debounced(100)
    autoSizeHeight() {
        const node = this.ref.current?.parentElement;

        const {id, containerModel} = this,
            {rowHeight, margin} = containerModel,
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
        this.isAutoSizing = true;
        containerModel.setViewLayout(newLayout);
        this.isAutoSizing = false;
    }

    autoHeightReaction() {
        return {
            track: () => [this.ref.current, this.autoHeight],
            run: ([node, autoHeight]) => {
                if (node && autoHeight) {
                    this.mutationObserver = this.mutationObserver ??
                        new window.MutationObserver(() => this.autoSizeHeight());
                    this.resizeObserver = this.resizeObserver ??
                        new window.ResizeObserver(() => this.autoSizeHeight());
                    this.mutationObserver.observe(node,
                        {
                            attributes: true,
                            attributeFilter: ['style'],
                            subtree: true
                        }
                    );
                    this.resizeObserver.observe(node.parentElement);
                } else {
                    this.mutationObserver?.disconnect();
                    this.resizeObserver?.disconnect();
                }
            }
        };
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
        this.resizeObserver?.disconnect();
        super.destroy();
    }
}
