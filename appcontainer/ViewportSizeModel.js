/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';

/**
 * Track observable width / height of the browser viewport, and provide observable
 * access to device orientation
 *
 * @private
 */
export class ViewportSizeModel extends HoistModel {

    /** @member {Object} - contains `width` and `height` in pixels */
    @observable.ref size;

    /** @member {Object} - contains `width` and `height` in pixels */
    initialSize;

    /** @returns {boolean} */
    @computed
    get isPortrait() {
        return this.size.width < this.size.height;
    }

    /** @returns {boolean} */
    get isLandscape() {
        return !this.isPortrait;
    }

    constructor() {
        super();
        makeObservable(this);

        this.initialSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        window.addEventListener('resize', () => this.onResize());
        this.setViewportSize();
    }

    //---------------------
    // Implementation
    //---------------------
    onResize() {
        // On touch devices, we don't expect the actual area of the viewport to change,
        // only it's orientation (i.e. swapping width and height). The only expected cause of
        // changes to the viewport area is showing the keyboard, which we should ignore.
        if (XH.isPhone || XH.isTablet) {
            const area = window.innerWidth * window.innerHeight,
                initialArea = this.initialSize.width * this.initialSize.height;
            if (area < initialArea) return;
        }

        this.setViewportSize();
    }

    @action
    setViewportSize() {
        this.size = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
