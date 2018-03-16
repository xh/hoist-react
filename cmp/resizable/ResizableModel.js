/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {XH} from 'hoist/core';
import {setter, observable, autorun, action} from 'hoist/mobx';

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
        const pref = prefName ? XH.getPref(prefName, null) : {};
        this.prefName = prefName;
        this.setContentSize('contentSize' in pref ? pref.contentSize : contentSize);
        this.setIsOpen('isOpen' in pref ? pref.isOpen : isOpen);
        
        if (prefName) {
            autorun(() => this.syncToPref());
        }
    }

    syncToPref() {
        const {prefName} = this;;
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
    }

    @action
    setContentSize(contentSize) {
        this.contentSize = contentSize;
    }
}
