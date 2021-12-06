/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, computed, observable, makeObservable} from '@xh/hoist/mobx';
import {isFinite} from 'lodash';

/**
 * Track observable width / height of the browser viewport, and provide observable
 * access to device orientation
 *
 * @private
 */
export class ViewportSizeModel extends HoistModel {

    /** @member {Object} - contains `width` and `height` in pixels */
    @observable.ref size;

    /** @member {int} - orientation in degrees [0, 90,180, 270] */
    @observable.ref orientation;

    /** @returns {boolean} */
    @computed
    get isPortrait() {
        const {orientation, size} = this;
        if (isFinite(orientation)) return orientation === 0 || orientation === 90;
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
        this.orientation = window.orientation;
        this.size = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }
}
