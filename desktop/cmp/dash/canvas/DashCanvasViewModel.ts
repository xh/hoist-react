/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {DashCanvasViewSpec} from '@xh/hoist/desktop/cmp/dash';
import {DashViewConfig, DashViewModel} from '../DashViewModel';
import '@xh/hoist/desktop/register';
import {createObservableRef} from '@xh/hoist/utils/react';
import {bindable, observable} from '@xh/hoist/mobx';
import {ReactNode} from 'react';

/**
 * Model for a content item within a DashCanvas.
 */
export class DashCanvasViewModel extends DashViewModel<DashCanvasViewSpec> {
    /** True (default) to allow duplicating the view. */
    @observable accessor allowDuplicate: boolean;

    /** Hide the Header Panel for the view? Default false. */
    @observable accessor hidePanelHeader: boolean;

    /** Hide the menu button for the view? Default false. */
    @observable accessor hideMenuButton: boolean;

    /** Should the view resize its height to fit its contents? */
    @observable accessor autoHeight: boolean;

    /** Additional items to include in header. */
    @bindable.ref accessor headerItems: ReactNode[] = [];

    ref = createObservableRef<HTMLElement>();

    constructor(cfg: DashViewConfig<DashCanvasViewSpec>) {
        super(cfg);
        this.allowDuplicate = cfg.viewSpec.allowDuplicate ?? true;
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
            when: () => !!ref.current,
            run: () => ref.current.scrollIntoView({behavior: 'smooth', block: 'nearest'})
        });
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
        const h = Math.ceil((height + HEADER_HEIGHT + margin[1]) / (rowHeight + margin[1]));
        if (h === viewLayout.h) return;

        // Send the new layout back to the parent model
        containerModel.setViewLayout({...viewLayout, h});
    }
}
