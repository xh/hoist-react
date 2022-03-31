/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {DashViewSpec} from '@xh/hoist/desktop/cmp/dash/DashViewSpec';

/**
 * Spec used to generate DashGridLayoutViews and DashGridLayoutViewModels within a
 * DashGridLayoutContainer.  Extends {@see DashViewSpec}
 *
 * This class is not typically created directly within applications. Instead, specify
 * DashGridLayoutViewSpec configs via the `DashGridLayoutContainerModel.viewSpecs` constructor
 * config.
 */
export class DashGridLayoutViewSpec extends DashViewSpec {

    height;
    width;

    /**
     *
     * @param {number} height - initial height of view when added to container (default 3)
     * @param {number} width - initial width of view when added to container (default 3)
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