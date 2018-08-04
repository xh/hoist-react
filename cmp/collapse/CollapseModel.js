/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {HoistModel} from '@xh/hoist/core';
import {observable} from '@xh/hoist/mobx';

/**
 * This class provides the underlying state for Components that
 * can render in a collapsed view.
 *
 * See also CollapseSupport.
 */
@HoistModel
export class CollapseModel {

    /**
     * Is the related Component rendering in a collapsed state?
     */
    @observable collapsed;

    /**
     * Valid values include 'top', 'left', 'right', and 'bottom'.
     * For values of 'top' and 'bottom', this component should be prepared
     * to render in a relatviely thin horizontal rectangle.  For values of
     * 'left' and 'right', this component should be prepared to render in a
     * relatively narrow vertical bar.
     */
    @observable side;

    /**
     * How should collapsed content be rendered?
     * Valid values include 'lazy', 'always', and 'unmountOnHide'.
     */
    renderMode = null;

    constructor({collapsed = false, side ='top', renderMode = 'lazy'}) {
        this.collapsed = collapsed;
        this.side = side;
        this.renderMode = renderMode;
    }

    @action
    toggleCollapsed() {this.collapsed = !this.collapsed;}

    @action
    setCollapsed(v) {this.collapsed = v}

    @action
    setSide(v) {this.side = side}
}