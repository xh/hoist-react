/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {DashViewSpec} from '@xh/hoist/desktop/cmp/dash/DashViewSpec';

/**
 * Spec used to generate DashCanvasViews and DashCanvasViewModels within a
 * DashCanvas.  Extends {@see DashViewSpec}
 *
 * -------- !! NOTE: THIS COMPONENT IS CURRENTLY IN BETA !! --------
 * -- Its API is under development and subject to breaking changes --
 *
 * This class is not typically created directly within applications. Instead, specify
 * DashCanvasViewSpec configs via the `DashCanvasModel.viewSpecs` constructor
 * config.
 *
 * @Beta
 */
export class DashCanvasViewSpec extends DashViewSpec {

    height;
    width;

    /**
     *
     * @param {number} height - initial height of view when added to canvas (default 3)
     * @param {number} width - initial width of view when added to canvas (default 3)
     */
    constructor({
        height = 3,
        width = 3,
        ...rest
    }) {
        super(rest);
        this.height = height;
        this.width = width;
    }
}