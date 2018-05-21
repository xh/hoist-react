/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH, HoistModel} from '@xh/hoist/core';
import {observable, action} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';

/**
 * A Model for managing the state of a Resizable.
 */
@HoistModel()
export class ResizableModel {

    @observable contentSize = null;
    @observable isOpen = null;
    @observable isResizing = false;

    defaultContentSize = null;

    prefName = null;

    /**
     * @param {string} [prefName] preference name to load/save state of resizable component
     * @param {int} [contentSize] default size in pixels of resizable component.
     *      Will be used in absence of size state and when opening from a collapsed state.
     * @param {boolean} [isOpen] default openness of resizable component.
     *      Will be used in absence of isOpen state.
     */
    constructor({prefName = null, contentSize = 0, isOpen = true}) {
        if (prefName && !XH.prefService.hasKey(prefName)) {
            console.warn(`Unknown preference for storing state of resizable: '${prefName}'`);
            prefName = null;
        }

        const pref = prefName ? XH.getPref(prefName) : {};
        this.prefName = prefName;
        this.defaultContentSize = contentSize;
        this.setContentSize('contentSize' in pref ? pref.contentSize : contentSize);
        this.setIsOpen('isOpen' in pref ? pref.isOpen : isOpen);


        if (prefName) {
            this.addAutorun(() => this.syncToPref(), {delay: 1000});
        }
    }

    @action
    setIsOpen(isOpen) {

        // When opening from collapsed position restore *default* size.
        // This may be a suboptimal in some cases (you lose previous user "size"), but avoids
        // confusing behavior where 'opening' a collapsed panel could cause it to shrink.
        if (this.isOpen === false && isOpen) {
            this.contentSize = this.defaultContentSize;
        }

        this.isOpen = isOpen;

        this.dispatchResize();
    }

    @action
    setContentSize(contentSize) {
        this.contentSize = contentSize;
    }

    @action
    setIsResizing(isResizing) {
        this.isResizing = isResizing;
        if (!isResizing) this.dispatchResize();
    }

    //------------------
    // Implementation
    //------------------
    syncToPref() {
        XH.prefService.set(this.prefName, {
            isOpen: this.isOpen,
            contentSize: this.contentSize
        });
    }

    dispatchResize() {
        // Forces other components to redraw if required.
        wait(1).then(() => window.dispatchEvent(new Event('resize')));
    }
}
