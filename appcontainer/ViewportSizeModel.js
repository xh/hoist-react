/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
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

    /** @returns {boolean} */
    @computed
    get isPortrait() {
        const {size} = this; // Force triggering observation of size.

        // Check Modern API and legacy API (for safari, BB Access)
        let orientation = this.getOrientation() ?? this.getLegacyOrientation();
        if (orientation !== null) return orientation === 0 || orientation === 180;

        // Default to aspect ratio
        return size.width < size.height;
    }

    /** @returns {boolean} */
    get isLandscape() {
        return !this.isPortrait;
    }

    constructor() {
        super();
        makeObservable(this);
        window.addEventListener('resize', () => this.setViewportSize());
        this.setViewportSize();
    }

    //---------------------
    // Implementation
    //---------------------
    @action
    setViewportSize() {
        this.size = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    getOrientation() {
        const {orientation} = window.screen;
        return orientation ? orientation.angle : null;
    }

    getLegacyOrientation() {
        const {orientation} = window;
        return isFinite(orientation) ? orientation: null;
    }

}
