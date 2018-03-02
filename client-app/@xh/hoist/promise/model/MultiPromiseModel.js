/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, action, computed} from 'hoist/mobx';


/**
 * Tracks the resoloution state of a stream of promise invocations.
 */
export class MultiPromiseModel {

    @observable pendingCount = 0;

    @computed get isPending() {
        return this.pendingCount > 0;
    }
    
    @action
    link(promise) {
        this.pendingCount++;
        promise.finally(() => this.onComplete());
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    @action
    onComplete() {
        if (this.pendingCount) this.pendingCount--;
    }
}


