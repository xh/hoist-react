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

    /** @member {Number} */
    @observable width;

    /** @member {Number} */
    @observable height;

    /** @returns {Object} */
    @computed.struct
    get size() {
        const {width, height} = this;
        return {width, height};
    }

    /** @returns {boolean} */
    @computed
    get isPortrait() {
        return this.width < this.height;
    }

    /** @returns {boolean} */
    get isLandscape() {
        return !this.isPortrait;
    }

    constructor() {
        super();
        makeObservable(this);
        window.addEventListener('resize', () => this.setViewportSize());
    }

    init() {
        this.setViewportSize();
    }

    //---------------------
    // Implementation
    //---------------------
    @action
    setViewportSize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }
}