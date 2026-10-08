/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {XH} from '@xh/hoist/core';
import {reaction} from '@xh/hoist/mobx';
import {PrefService} from '@xh/hoist/svc';
import {hoistCore, initTestAppAsync, prefEntry} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * User preferences, read and written via `XH.getPref()` and `XH.setPref()` and saved to hoist-core.
 * Prefs hold the user state that apps and Hoist components persist, such as grid layouts, themes
 * and panel sizes. A broken write path silently discards that state, so these tests pin what is
 * sent to the server, and when.
 */
describe('PrefService', () => {
    beforeAll(async () => {
        // Each test changes its own prefs, so tests do not depend on each other's changes.
        hoistCore.prefs = {
            ...hoistCore.prefs,
            pageSize: prefEntry('int', 50, 100),
            region: prefEntry('string', 'US'),
            showDetail: prefEntry('bool', false),
            gridState: prefEntry('json', {}, {sortBy: ['name']}),
            chartOptions: prefEntry('json', {}),
            filterState: prefEntry('json', {}),
            maxRows: prefEntry('int', 500),
            lastTab: prefEntry('string', 'summary'),
            lastView: prefEntry('string', 'list'),
            panelWidth: prefEntry('int', 200),
            font: prefEntry('string', 'Inter'),
            density: prefEntry('string', 'tight', 'loose'),
            columnState: prefEntry('json', {})
        };
        await initTestAppAsync();

        // Boot saves the initial sizing mode - send it now, so tests see only their own changes.
        await XH.prefService.pushPendingAsync();
        hoistCore.clearRequests();
    });

    describe('get', () => {
        it('throws for an unknown key unless given a default', () => {
            expect(() => XH.getPref('notOnServer')).toThrow(
                "Preference key not found: 'notOnServer'"
            );
            expect(XH.getPref('notOnServer', 25)).toBe(25);
        });
    });

    describe('set', () => {
        it.each([
            ['string', 'region', 5],
            ['int', 'pageSize', '200'],
            ['bool', 'showDetail', 'true'],
            ['json', 'chartOptions', 'line']
        ])('rejects a value of the wrong type for a pref of type %s', (type, key, value) => {
            expect(() => XH.setPref(key, value)).toThrow(`must be of type ${type}`);
        });

        it('sends changed values to the server in one request, identifying the user', async () => {
            XH.setPref('region', 'EU');
            XH.setPref('showDetail', true);
            await XH.prefService.pushPendingAsync();

            const reqs = hoistCore.requestsTo('xh/setPrefs');
            expect(reqs).toHaveLength(1);
            expect(reqs[0].query).toEqual({clientUsername: 'jdoe'});
            expect(reqs[0].json).toEqual({region: 'EU', showDetail: true});
            expect(XH.prefService.isSet('region')).toBe(true);
        });

        it('does not save a value equal to the current one', async () => {
            // Saving would also mark the pref as set, pinning the user to the current default.
            XH.setPref('gridState', {sortBy: ['name']});
            XH.setPref('maxRows', 500);
            await XH.prefService.pushPendingAsync();

            expect(hoistCore.requestsTo('xh/setPrefs')).toHaveLength(0);
            expect(XH.prefService.isSet('maxRows')).toBe(false);
        });

        it('stores and sends a frozen copy of the value', async () => {
            const options = {series: ['revenue']};
            XH.setPref('chartOptions', options);
            options.series.push('margin');

            expect(XH.getPref('chartOptions')).toEqual({series: ['revenue']});
            expect(Object.isFrozen(XH.getPref('chartOptions').series)).toBe(true);

            await XH.prefService.pushPendingAsync();
            const [req] = hoistCore.requestsTo('xh/setPrefs');
            expect(req.json).toEqual({chartOptions: {series: ['revenue']}});
        });
    });

    describe('unset', () => {
        it("reverts to the default and clears the user's value on the server", async () => {
            // Fixed in 86.4.0 (#4491) - unset() had saved the default as the user's own value.
            expect(XH.prefService.isSet('pageSize')).toBe(true);

            XH.prefService.unset('pageSize');
            expect(XH.getPref('pageSize')).toBe(50);
            expect(XH.prefService.isSet('pageSize')).toBe(false);

            await XH.prefService.pushPendingAsync();
            const reqs = hoistCore.requestsTo('xh/unsetPrefs');
            expect(reqs).toHaveLength(1);
            expect(reqs[0].query).toEqual({clientUsername: 'jdoe'});
            expect(reqs[0].json).toEqual(['pageSize']);
            expect(hoistCore.requestsTo('xh/setPrefs')).toHaveLength(0);
        });

        it('sends only the unset when it follows a set that is not yet saved', async () => {
            XH.setPref('filterState', {region: 'EU'});
            XH.prefService.unset('filterState');
            await XH.prefService.pushPendingAsync();

            expect(hoistCore.requestsTo('xh/setPrefs')).toHaveLength(0);
            expect(hoistCore.requestsTo('xh/unsetPrefs')[0].json).toEqual(['filterState']);
        });
    });

    describe('observability', () => {
        it('notifies observers of a pref when its value is set', () => {
            const seen = observe('font');

            XH.setPref('font', 'IBM Plex Sans');
            XH.setPref('font', 'IBM Plex Sans');

            expect(seen).toEqual(['IBM Plex Sans']);
        });

        it('notifies observers of a pref when it is unset', () => {
            const seen = observe('density');

            XH.prefService.unset('density');

            expect(seen).toEqual(['tight']);
            expect(XH.prefService.isSet('density')).toBe(false);
        });

        it('does not notify observers of other prefs', () => {
            const seen = observe('columnState');

            XH.setPref('lastTab', 'positions');

            expect(seen).toEqual([]);
        });
    });

    describe('pushPendingAsync', () => {
        it('saves changes made in quick succession in one request, 5 seconds later', async () => {
            // A new instance - one already used on real timers keeps its pending debounce timer.
            const svc = new PrefService();
            onTestFinished(() => svc.destroy());
            await svc.initAsync({span: null});
            vi.useFakeTimers();

            // E.g. a panel resized by dragging.
            svc.set('panelWidth', 250);
            svc.set('panelWidth', 260);
            svc.set('panelWidth', 270);
            await vi.advanceTimersByTimeAsync(4999);
            expect(hoistCore.requestsTo('xh/setPrefs')).toHaveLength(0);

            await vi.advanceTimersByTimeAsync(1);
            await vi.waitFor(() => expect(hoistCore.requestsTo('xh/setPrefs')).toHaveLength(1));
            expect(hoistCore.requestsTo('xh/setPrefs')[0].json).toEqual({panelWidth: 270});
        });

        it('sends pending changes once when called again before the first call completes', async () => {
            // Fixed in 86.0.1 (#4430) - the queue is now cleared before the request is sent.
            XH.setPref('lastTab', 'details');
            await Promise.all([
                XH.prefService.pushPendingAsync(),
                XH.prefService.pushPendingAsync()
            ]);

            expect(hoistCore.requestsTo('xh/setPrefs')).toHaveLength(1);
        });

        it('saves pending changes with keepalive when the page is hidden', async () => {
            // Added in v86.0.1 (#4430) - keepalive lets the request finish if the tab is closed.
            const fetchSpy = vi.spyOn(globalThis, 'fetch');
            XH.setPref('lastView', 'chart');
            setPageHidden();

            await vi.waitFor(() => expect(hoistCore.requestsTo('xh/setPrefs')).toHaveLength(1));
            expect(hoistCore.requestsTo('xh/setPrefs')[0].json).toEqual({lastView: 'chart'});

            const [, init] = fetchSpy.mock.calls.find(([url]) => String(url).includes('setPrefs'));
            expect(init.keepalive).toBe(true);
        });
    });
});

/** Record each new value of a pref seen by a MobX reaction, until the test finishes. */
function observe(key: string): any[] {
    const ret = [],
        disposer = reaction(
            () => XH.getPref(key),
            v => ret.push(v)
        );
    onTestFinished(disposer);
    return ret;
}

/** Report the page as hidden, as the browser does when the user switches tabs or closes one. */
function setPageHidden() {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    window.dispatchEvent(new Event('visibilitychange'));
    expect(XH.pageState).toBe('hidden');

    onTestFinished(() => {
        visibility.mockRestore();
        window.dispatchEvent(new Event('visibilitychange'));
    });
}
