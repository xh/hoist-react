/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {observable, action, computed} from '@xh/hoist/mobx';

/**
 * Tracks the resolution state of a stream of promise invocations.
 */
export class MultiPromiseModel {

    @observable pendingCount = 0;
    @observable message = '';

    /** Are any linked Promises still outstanding? */
    @computed
    get isPending() {
        return this.pendingCount > 0;
    }
    
    @action
    link(promise) {
        this.pendingCount++;
        promise.finally(() => this.onComplete());
    }

    @action
    setMessage(msg) {
        this.message = msg;
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    @action
    onComplete() {
        if (this.pendingCount) this.pendingCount--;
    }
}


