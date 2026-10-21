/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * JsonBlobs - small bundles of app state that hoist-core persists per user, or globally. A lookup
 * that returns the wrong blob hands one user's state to another, or loses the user's own.
 */
describe('JsonBlobService', () => {
    beforeAll(() => initTestAppAsync());

    describe('findAsync', () => {
        // 90.0.0 (#4869) - sent no owner, so the server matched only a global blob.
        it("finds the user's own blob, not a global blob with the same name", async () => {
            const {jsonBlobs} = hoistCore;
            jsonBlobs.add({type: 'grid', name: 'layout', value: {v: 'mine'}});
            jsonBlobs.add({
                type: 'grid',
                name: 'layout',
                owner: null,
                acl: '*',
                value: {v: 'global'}
            });

            const ret = await XH.jsonBlobService.findAsync('grid', 'layout');

            expect(ret.value).toEqual({v: 'mine'});
        });
    });
});
