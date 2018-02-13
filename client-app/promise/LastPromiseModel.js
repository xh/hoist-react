/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, action, computed} from 'hoist/mobx';


/**
 * Tracks the resolution state of the last of a series of promise invocations.
 *
 * Currently it only tracks the *last* invocation, but could
 * be enhanced to maintain historical statistics.
 *
 * See also MultiPromiseModel.
 */
export class LastPromiseModel {

    @observable state = 'resolved';
    lastCall = null;

    @computed
    get isPending() {
        return this.state === 'pending';
    }
    
    @action
    link(promise) {
        this.lastCall = promise;
        this.state = 'pending';
        promise.then(v => {
            if (promise === this.lastCall) this.onSuccess(v);
        }).catch(e => {
            if (promise === this.lastCall) this.onReject(e);
        });
    }

    //-----------------------------
    // Implementation
    //-----------------------------
    @action
    onSuccess(value) {
        this.state = 'resolved';
    }

    @action
    onReject(reason) {
        this.state = 'rejected';
    }
}


