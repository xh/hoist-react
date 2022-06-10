/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {calcGridColWidth} from '@xh/hoist/desktop/cmp/dash/canvas/impl/utils';
import {DashViewModel} from '@xh/hoist/desktop/cmp/dash/DashViewModel';
import {throwIf} from '@xh/hoist/utils/js';
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

    constructor(cfg) {
        super(cfg);
        makeObservable(this);
        this.hidePanelHeader = !!cfg.viewSpec.hidePanelHeader;
        this.hideMenuButton = !!cfg.viewSpec.hideMenuButton;
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
     * @param {'width'|'height'|'all'} [dimension]
     */
    autoSize(dimension = 'all') {
        throwIf(!['width', 'height', 'all'].includes(dimension),
            `Invalid dimension: ${dimension}: should be 'width', 'height', or 'all`);

        const resizeWidth = dimension === 'all' || dimension === 'width',
            resizeHeight = dimension === 'all' || dimension === 'height';

        const {id, ref, containerModel} = this,
            {layout, rowHeight, margin} = containerModel,
            newLayout = {...containerModel.getLayout(id)};

        // Hold on to initial width and height:
        const initWidth = ref.current.parentElement.style.width,
            initHeight = ref.current.parentElement.style.height;

        // Set affected dimensions to 'auto' to leverage some CSS magic
        if (resizeWidth) ref.current.parentElement.style.width = 'auto';
        if (resizeHeight) ref.current.parentElement.style.height = 'auto';

        // Calculate new width in grid units
        if (resizeWidth) {
            const colWidth = calcGridColWidth(containerModel),
                newWidthPx = ref.current.parentElement.offsetWidth;
            newLayout.w = Math.round((newWidthPx + margin[0]) / (colWidth + margin[0]));
        }

        // Calculate new height in grid units
        if (resizeHeight) {
            const newHeightPx = ref.current.parentElement.offsetHeight;
            newLayout.h = Math.round((newHeightPx + margin[1]) / (rowHeight + margin[1]));
        }

        // Set CSS properties back to initial values
        // (best to let ReactGridLayout mutate these directly)
        ref.current.parentElement.style.width = initWidth;
        ref.current.parentElement.style.height = initHeight;

        // Send the new layout back to the parent model
        this.containerModel.setLayout(uniqBy([newLayout, ...layout], 'i'));
    }

    /**
     * Specify array of items to be added to the right-side of the panel header
     * @param {ReactNode[]} items
     */
    @action
    setHeaderItems(items) {
        this.headerItems = items;
    }
}
