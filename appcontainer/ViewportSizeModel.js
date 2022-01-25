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

        // iOS browsers - specifically iOS WebKit components, i.e. *not* Safari itself, but
        // mobile Chrome, Airwatch, BB Access - have very strange / laggy resize reporting.
        // The below seems crazy, but we want to update as quickly as possible while allowing up to
        // 300ms to ensure we evaluate resizes once they have "settled" and the browser orientation
        // and window APIs report properly updated values.
        this.addReaction({
            track: () => this.size,
            run: () => this.updateOrientation(),
            debounce: 100,
            fireImmediately: true
        });
        this.addReaction({
            track: () => this.size,
            run: () => this.updateOrientation(),
            debounce: 200
        });
        this.addReaction({
            track: () => this.size,
            run: () => this.updateOrientation(),
            debounce: 300
        });
    }

    //---------------------
    // Implementation
    //---------------------
    // Debounced to account for slow inner window resize on mobile. A single 100ms debounce does
    // appear to reliably catch resize events even on problematic mobile browsers (see above).
    @debounced(100)
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
