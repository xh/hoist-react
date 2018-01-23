/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {observable, action, computed} from 'hoist/mobx';


/**
 * Tracks the resoloution state of one or more promises
 *
 * Currently it only tracks the *last* invocation, but could
 * be enhanced to maintain historical statistics.
 */
export class PromiseState {

    @observable value = null;
    @observable reason = null;
    @observable state = 'resolved';

    executionCount = 0;
    lastCall = null;


    @computed get isPending() {
        return this.state === 'pending';
    }
    
    @action
    bind(promise) {
        this.executionCount++;
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
        this.value = value;
        this.reason = null;
        this.state = 'resolved';
    }

    @action
    onReject(reason) {
        this.reason = reason;
        this.value = null;
        this.state = 'rejected';
    }
}


