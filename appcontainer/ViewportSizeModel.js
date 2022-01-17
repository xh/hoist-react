/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {HoistModel} from '@xh/hoist/core';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {debounced} from '@xh/hoist/utils/js';
import {isFinite, isString} from 'lodash';
import {runInAction} from 'mobx';

/**
 * Track observable width / height of the browser viewport, and provide observable
 * access to device orientation
 *
 * @private
 */
export class ViewportSizeModel extends HoistModel {

    /** @member {Object} - contains `width` and `height` in pixels */
    @observable.ref size;

    /** @member {boolean} */
    @observable isPortrait;

    /** @returns {boolean} - observable inverse of isPortrait. */
    get isLandscape() {
        return !this.isPortrait;
    }

    constructor() {
        super();
        makeObservable(this);
        window.addEventListener('resize', () => this.setViewportSize());
        this.setViewportSize();

        this.addReaction({
            track: () => this.size,
            run: () => this.updateOrientation(),
            fireImmediately: true,
            // Further debounce (on top of debounced setViewportSize) to allow for even greater
            // lag observed on mobile device responses to DOM orientation APIs.
            debounce: 100
        });
    }

    //---------------------
    // Implementation
    //---------------------
    @debounced(100)  // Debounced to account for slow inner window resize on mobile.
    setViewportSize() {
        runInAction(() => this.size = {
            width: window.innerWidth,
            height: window.innerHeight
        });
    }

    @action
    updateOrientation() {
        if (isString(window.screen?.orientation?.type)) {
            // First check modern API.
            this.isPortrait = window.screen.orientation.type.startsWith('portrait');
        } else if (isFinite(window.orientation)) {
            // ...fallback to older API for Safari/BB browser.
            this.isPortrait = window.orientation === 0 || window.orientation === 180;
        } else {
            // ...final fallback to aspect ratio.
            const {width, height} = this.size;
            this.isPortrait = width < height;
        }
    }

}
