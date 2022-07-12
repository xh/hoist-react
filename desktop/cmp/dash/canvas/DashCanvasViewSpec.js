/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {DashViewSpec} from '@xh/hoist/desktop/cmp/dash/DashViewSpec';
import '@xh/hoist/desktop/register';

/**
 * Spec used to generate DashCanvasViews and DashCanvasViewModels within a {@see DashCanvas}.
 *
 * This class is not typically created directly within applications. Instead, specify as plain
 * object configs via the `DashCanvasModel.viewSpecs` constructor config.
 */
export class DashCanvasViewSpec extends DashViewSpec {

    height;
    width;
    hidePanelHeader;
    hideMenuButton;

    /**
     * @param {number} [height] - initial height of view when added to canvas (default 5)
     * @param {number} [width] - initial width of view when added to canvas (default 5)
     * @param {boolean} [hidePanelHeader] - true to hide the panel header (default false)
     * @param {boolean} [hideMenuButton] - true to hide the panel header menu button (default false)
     */
    constructor({
        height = 5,
        width = 5,
        hidePanelHeader = false,
        hideMenuButton = false,
        ...rest
    }) {
        super(rest);
        this.height = height;
        this.width = width;
        this.hidePanelHeader = hidePanelHeader;
        this.hideMenuButton = hideMenuButton;
    }
}
