/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';
import {observable, autorun, action} from 'hoist/mobx';
import {wait} from 'hoist/promise';

/**
 * A Model for managing the state of a Resizable.
 */
export class ResizableModel {

    @observable contentSize = null;
    @observable isOpen = null;

    isLazyState = true;

    prefName = null;

    /**
     * Construct this object.
     */
    constructor({prefName = null, contentSize = 0, isOpen = true}) {

        if (prefName && !XH.prefService.hasKey(prefName)) {
            console.warn(`Unknown preference for storing state of resizable: '${prefName}'`);
            prefName = null;
        }
        
        const pref = prefName ? XH.getPref(prefName) : {};
        this.prefName = prefName;
        this.setContentSize('contentSize' in pref ? pref.contentSize : contentSize);
        this.setIsOpen('isOpen' in pref ? pref.isOpen : isOpen);
        
        if (prefName) {
            autorun(() => this.syncToPref());
        }
    }

    syncToPref() {
        const {prefName} = this;
        if (prefName) {
            XH.prefService.set(prefName, {
                isOpen: this.isOpen,
                contentSize: this.contentSize
            });
        }
    }

    @action
    setIsOpen(isOpen) {
        this.isLazyState = false;
        this.isOpen = isOpen;
        this.dispatchResize();
    }

    @action
    setContentSize(contentSize) {
        this.contentSize = contentSize;
        this.dispatchResize();
    }

    dispatchResize() {
        wait(1).then(() => window.dispatchEvent(new Event('resize')));
    }
}
