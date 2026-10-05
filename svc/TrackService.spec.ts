/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test';
import {beforeAll, describe, expect, it} from 'vitest';

/**
 * Activity tracking via `XH.track()`, sent in batches to hoist-core. The Admin Console's activity
 * log and app usage stats are built from these entries, so the entry shape is a contract with the
 * server, and the rules for what is skipped keep that log from filling with noise.
 */
describe('TrackService', () => {
    beforeAll(async () => {
        hoistCore.configs.xhActivityTrackingConfig.maxDataLength = 100;
        await initTestAppAsync();
        hoistCore.clearRequests();
    });

    describe('pushPendingAsync', () => {
        it('sends queued entries to the server in one request, identifying the user', async () => {
            XH.track({
                category: 'Export',
                message: 'Exported <b>Orders</b>',
                data: {rows: 10},
                elapsed: 120
            });
            XH.track('Viewed Orders');
            await XH.trackService.pushPendingAsync();

            const reqs = hoistCore.requestsTo('xh/track');
            expect(reqs).toHaveLength(1);
            expect(reqs[0].query).toEqual({clientUsername: 'jdoe'});
            expect(reqs[0].json.entries).toEqual([
                {
                    msg: 'Exported Orders',
                    category: 'Export',
                    data: {rows: 10},
                    elapsed: 120,
                    severity: 'INFO',
                    clientUsername: 'jdoe',
                    appVersion: '1.0.0',
                    clientAppCode: 'testApp',
                    loadId: XH.loadId,
                    tabId: XH.tabId,
                    url: window.location.href,
                    timestamp: expect.any(Number)
                },
                expect.objectContaining({msg: 'Viewed Orders', severity: 'INFO'})
            ]);
        });
    });

    describe('track', () => {
        it('drops data larger than the configured limit, keeping the entry', async () => {
            // Fixed in v74.1.1 (#4023) - the limit was checked against an object's length.
            XH.track({message: 'Saved notes', data: {notes: 'x'.repeat(100)}});
            await XH.trackService.pushPendingAsync();

            const [entry] = hoistCore.requestsTo('xh/track')[0].json.entries;
            expect(entry.msg).toBe('Saved notes');
            expect(entry.data).toBeNull();
        });

        it('tracks a once-per-session activity only once', async () => {
            // As tab containers do for tab views.
            const opts = {category: 'Navigation', message: 'Viewed Trades tab'};
            XH.track({...opts, oncePerSession: true});
            XH.track({...opts, oncePerSession: true});
            await XH.trackService.pushPendingAsync();

            expect(hoistCore.requestsTo('xh/track')[0].json.entries).toHaveLength(1);
        });

        it('skips activity from automatic refreshes', async () => {
            // Otherwise a tracked load would log an entry on every auto-refresh.
            XH.track({message: 'Loaded positions', loadSpec: {isAutoRefresh: true}});
            await XH.trackService.pushPendingAsync();

            expect(hoistCore.requestsTo('xh/track')).toHaveLength(0);
        });

        // Fixed in 89.0.0 - the given timestamp was replaced with the send time.
        it('sends the timestamp given by the caller', async () => {
            const loadStarted = Date.now() - 5000;
            XH.track({message: 'Loaded app', timestamp: loadStarted});
            await XH.trackService.pushPendingAsync();

            const [entry] = hoistCore.requestsTo('xh/track')[0].json.entries;
            expect(entry.timestamp).toBe(loadStarted);
        });
    });
});
