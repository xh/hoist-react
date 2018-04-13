/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {XH} from 'hoist/core';
import {allSettled} from 'hoist/promise';
import {EventSource} from 'hoist/utils/EventSource';

export class BaseService extends EventSource {

    isReady = false;

    async initAsync() {}

    /**
     * Initialize multiple services in parallel.
     *
     * @param svcs, one or more BaseServices.
     */
    static async ensureSvcsReadyAsync(...svcs) {
        const promises = svcs.map(it => it.ensureReadyAsync()),
            results = await allSettled(promises),
            errs = results.filter(it => it.state === 'rejected');

        if (errs.length === 1) {
            throw errs[0].reason;
        }

        if (errs.length > 1) {
            // Enhance entire result col w/class name, we care about errs only
            results.forEach((it, idx) => {
                it.name = svcs[idx].constructor.name;
            });
            const names = errs.map(it => it.name).join(', ');

            throw XH.exception({
                message: 'Failed to initialize services: ' + names,
                details: errs
            });
        }
        return svcs;
    }


    /**
     * Call to ensure service is initialized.
     */
    async ensureReadyAsync() {
        if (this.isReady) return;

        try {
            await this.initAsync();
            this.isReady = true;
        } catch (e) {
            console.error('Failed to initialize ' + this.constructor.name);
            console.error(e);
            throw e;
        }
    }
}