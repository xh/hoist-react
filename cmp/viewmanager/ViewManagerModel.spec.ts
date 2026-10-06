/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ViewInfo, ViewManagerModel, type ViewManagerConfig} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, persist, type PlainObject, XH} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {wait} from '@xh/hoist/promise';
import type {JsonBlob} from '@xh/hoist/svc';
import {
    hoistCore,
    hoistError,
    initTestAppAsync,
    type RecordedRequest,
    server,
    xhUrl
} from '@xh/hoist/test';
import {omit} from 'lodash';
import {http, HttpResponse} from 'msw';
import {afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * ViewManagerModel run against hoist-core's view endpoints: which view a user lands on, how
 * changes are tracked, saved and auto-saved, and the requests that carry them. Apps persist grid,
 * dashboard and filter state through these views, and the user's library of views lives only on
 * the server - a slip here loses or overwrites work users have saved.
 */
describe('ViewManagerModel', () => {
    let views: ViewServer;

    beforeAll(async () => {
        await initTestAppAsync();
        hoistCore.clearRequests();
    });

    beforeEach(() => {
        views = new ViewServer();
        views.add('mine', 'My Positions', {value: {sortBy: 'pnl'}});
        views.add('bobs', 'Bob Risk', {owner: 'bsmith', isShared: true});
        views.add('firm', 'Firm Standard', {owner: null, value: {sortBy: 'sector'}});
        server.use(...views.handlers);
        XH.sessionStorageService.clear();
    });

    // Let requests the model sends from reactions land before the test's handlers are removed.
    afterEach(async () => {
        vi.useRealTimers();
        await views.settleAsync();
    });

    describe('createAsync', () => {
        it('loads views and user state for its type and instance', async () => {
            views.state.autoSave = true;
            const vmm = await createAsync({instance: 'blotter'});

            const [req] = hoistCore.requestsTo('xhView/allData');
            expect(req.form).toEqual({type: 'portfolioGrid', viewInstance: 'blotter'});
            expect(vmm.views.map(it => it.token)).toEqual(['mine', 'bobs', 'firm']);
            expect(vmm.autoSave).toBe(true);
        });

        it.each<[string, PlainObject, Partial<ViewManagerConfig>, string]>([
            ['the saved current view', {currentView: 'mine'}, {}, 'mine'],
            ['initialViewSpec for a user with no current view', {}, {}, 'firm'],
            [
                'initialViewSpec when the current view was deleted',
                {currentView: 'gone'},
                {},
                'firm'
            ],
            ['the in-code default when the user last chose it', {currentView: null}, {}, null],
            // 76.0.0 (b50b59ce6) - users who had chosen the default before it was disabled.
            [
                'initialViewSpec when the user last chose the default, since disabled',
                {currentView: null},
                {enableDefault: false},
                'firm'
            ],
            [
                'the in-code default when initialViewSpec returns no view',
                {},
                {initialViewSpec: () => null},
                null
            ]
        ])('selects %s', async (_, state, config, token) => {
            Object.assign(views.state, state);
            const vmm = await createAsync({initialViewSpec: firstGlobalView, ...config});

            expect(vmm.view.token).toBe(token);
            expect(vmm.getValue()).toEqual(token ? views.get(token).value : {});
        });

        it("records a newly selected view as the user's current view", async () => {
            await createAsync({initialViewSpec: firstGlobalView});
            await vi.waitFor(() =>
                expect(hoistCore.requestsTo('xhView/updateState')).toHaveLength(1)
            );

            const [req] = hoistCore.requestsTo('xhView/updateState');
            expect(req.query).toEqual({type: 'portfolioGrid', viewInstance: 'default'});
            expect(req.json).toEqual({currentView: 'firm'});
        });

        it('installs the default view and reports the error when views fail to load', async () => {
            views.failNextLoad();
            const handleException = vi.spyOn(XH, 'handleException').mockImplementation(() => {});

            const vmm = await createAsync({initialViewSpec: firstGlobalView});

            // Bound models read the value as soon as createAsync resolves.
            expect(vmm.view.isDefault).toBe(true);
            expect(vmm.getValue()).toEqual({});
            expect(handleException).toHaveBeenCalledOnce();
        });

        // BUG: ViewManagerModel.ts:663-675 - after a failed load, the fallback default view is
        // loaded without being awaited, and lands after the currentView reaction (:709-713) is
        // added. The reaction then posts `currentView: null`, so a transient failure overwrites
        // the user's saved view, and their next visit opens the default instead.
        it.fails(
            "leaves the user's saved current view in place when views fail to load",
            async () => {
                views.state.currentView = 'mine';
                views.failNextLoad();
                vi.spyOn(XH, 'handleException').mockImplementation(() => {});

                await createAsync();
                await views.settleAsync();

                expect(views.state.currentView).toBe('mine');
            }
        );
    });

    describe('manageGlobal', () => {
        // e8004e92f (v88) - defaults from the server's check of xhJsonBlobConfig.globalWriteRoles.
        it.each<[string, boolean, boolean, boolean]>([
            ['is true when the server allows it', true, undefined, true],
            ['is false when the config disables it', true, false, false],
            ['is false when the server denies it, even if the config allows', false, true, false],
            // hoist-core < v42 sends no answer.
            ['falls back to the config when the server sends no answer', undefined, true, true],
            ['is false when neither the server nor config allows it', undefined, undefined, false]
        ])('%s', async (_, fromServer, config, expected) => {
            views.manageGlobal = fromServer;
            const vmm = await createAsync({manageGlobal: config});

            expect(vmm.manageGlobal).toBe(expected);
        });
    });

    describe('setValue', () => {
        it('tracks unsaved changes against the value of the current view', async () => {
            views.state.currentView = 'mine';
            const vmm = await createAsync();

            vmm.setValue({sortBy: 'name'});
            expect(vmm.isValueDirty).toBe(true);
            expect(vmm.getValue()).toEqual({sortBy: 'name'});

            // Values are compared as JSON, so keys with undefined values are not a change.
            vmm.setValue({sortBy: 'pnl', groupBy: undefined});
            expect(vmm.isValueDirty).toBe(false);
            expect(vmm.getValue()).toEqual({sortBy: 'pnl'});
        });

        it('preserves unsaved changes when the page reloads', async () => {
            views.state.currentView = 'mine';
            const vmm = await createAsync();
            vmm.setValue({sortBy: 'name'});

            const reloaded = await createAsync();
            expect(reloaded.view.value).toEqual({sortBy: 'pnl'});
            expect(reloaded.isValueDirty).toBe(true);
            expect(reloaded.getValue()).toEqual({sortBy: 'name'});
        });
    });

    describe('selectViewAsync', () => {
        it('confirms before discarding unsaved changes to an owned view', async () => {
            views.state.currentView = 'mine';
            const vmm = await createAsync(),
                confirm = vi.spyOn(XH, 'confirm').mockResolvedValueOnce(false);
            vmm.setValue({sortBy: 'name'});

            await vmm.selectViewAsync('firm');
            expect(confirm).toHaveBeenCalledOnce();
            expect(vmm.view.token).toBe('mine');
            expect(vmm.isValueDirty).toBe(true);

            confirm.mockResolvedValueOnce(true);
            await vmm.selectViewAsync('firm');
            expect(vmm.view.token).toBe('firm');
            expect(vmm.getValue()).toEqual({sortBy: 'sector'});
            expect(hoistCore.requestsTo('xhView/get').at(-1).form).toEqual({token: 'firm'});
        });
    });

    describe('saveAsync', () => {
        it('writes unsaved changes to the current view', async () => {
            views.state.currentView = 'mine';
            const vmm = await createAsync(),
                toast = vi.spyOn(XH, 'successToast').mockImplementation(() => null);
            vmm.setValue({sortBy: 'name'});

            await vmm.saveAsync();

            const [req] = hoistCore.requestsTo('xhView/updateValue');
            expect(req.query).toEqual({token: 'mine'});
            expect(req.json).toEqual({sortBy: 'name'});
            expect(vmm.isValueDirty).toBe(false);
            expect(vmm.view.value).toEqual({sortBy: 'name'});
            expect(toast).toHaveBeenCalledOnce();
        });

        it('confirms before overwriting a view saved elsewhere since it was loaded', async () => {
            views.state.currentView = 'mine';
            const vmm = await createAsync(),
                confirm = vi.spyOn(XH, 'confirm').mockResolvedValue(false);
            vmm.setValue({sortBy: 'name'});
            views.get('mine').lastUpdated += 60_000;

            await vmm.saveAsync();

            expect(confirm).toHaveBeenCalledOnce();
            expect(hoistCore.requestsTo('xhView/updateValue')).toHaveLength(0);
            expect(vmm.isValueDirty).toBe(true);
        });

        it('confirms before changing a global view for all users', async () => {
            views.state.currentView = 'firm';
            views.manageGlobal = true;
            const vmm = await createAsync(),
                confirm = vi.spyOn(XH, 'confirm').mockResolvedValue(false);
            vmm.setValue({sortBy: 'name'});

            await vmm.saveAsync();

            expect(confirm).toHaveBeenCalledOnce();
            expect(hoistCore.requestsTo('xhView/updateValue')).toHaveLength(0);
        });
    });

    describe('autoSave', () => {
        it('saves changes to an owned view once they have settled for 2s', async () => {
            Object.assign(views.state, {currentView: 'mine', autoSave: true});
            const vmm = await createAsync();
            vi.useFakeTimers();

            vmm.setValue({sortBy: 'name'});
            await vi.advanceTimersByTimeAsync(1000);
            vmm.setValue({sortBy: 'size'});
            await vi.advanceTimersByTimeAsync(1999);
            expect(hoistCore.requestsTo('xhView/updateValue')).toHaveLength(0);

            await vi.advanceTimersByTimeAsync(1);
            await vi.waitFor(() => expect(vmm.isValueDirty).toBe(false));
            const reqs = hoistCore.requestsTo('xhView/updateValue');
            expect(reqs.map(it => it.json)).toEqual([{sortBy: 'size'}]);
        });

        // BUG: ViewManagerModel.ts:743 (and :473 for saveAsync) - setAsView() with the saved view
        // clears the pending value, dropping any change made while the save was in flight. The
        // model then reports no unsaved changes, and the change is never saved.
        it.fails('keeps changes made while an auto-save is in flight', async () => {
            Object.assign(views.state, {currentView: 'mine', autoSave: true});
            const vmm = await createAsync();
            vi.useFakeTimers();

            vmm.setValue({sortBy: 'name'});
            const release = views.holdResponses();
            await vi.advanceTimersByTimeAsync(2000);
            await vi.waitFor(() =>
                expect(hoistCore.requestsTo('xhView/updateValue')).toHaveLength(1)
            );

            vmm.setValue({sortBy: 'size'});
            release();
            await vi.waitFor(() => expect(vmm.saveTask.isPending).toBe(false));

            expect(vmm.view.value).toEqual({sortBy: 'name'});
            expect(vmm.getValue()).toEqual({sortBy: 'size'});
            expect(vmm.isValueDirty).toBe(true);
        });
    });

    describe('saveAsAsync', () => {
        it('creates a view and selects it', async () => {
            const vmm = await createAsync(),
                toast = vi.spyOn(XH, 'successToast').mockImplementation(() => null);
            const spec = {
                name: 'Rates Desk',
                group: 'Desks',
                description: 'Rates positions',
                isShared: true,
                isGlobal: false,
                value: {sortBy: 'dv01'}
            };

            await vmm.saveAsAsync(spec);

            const [req] = hoistCore.requestsTo('xhView/create');
            expect(req.json).toEqual({type: 'portfolioGrid', ...spec});
            expect(vmm.view.name).toBe('Rates Desk');
            expect(vmm.view.isShared).toBe(true);
            expect(vmm.getValue()).toEqual({sortBy: 'dv01'});
            expect(vmm.ownedViews.map(it => it.name)).toContain('Rates Desk');
            expect(toast).toHaveBeenCalledOnce();
        });
    });

    describe('deleteViewsAsync', () => {
        it('deletes views by token, then selects initialViewSpec if the current view was deleted', async () => {
            views.add('mine2', 'My Risk');
            views.state.currentView = 'mine';
            const vmm = await createAsync({initialViewSpec: firstGlobalView});

            await vmm.deleteViewsAsync(vmm.ownedViews);

            const [req] = hoistCore.requestsTo('xhView/delete');
            expect(req.query).toEqual({tokens: 'mine,mine2'});
            expect(vmm.views.map(it => it.token).sort()).toEqual(['bobs', 'firm']);
            expect(vmm.view.token).toBe('firm');
        });
    });

    describe('validateViewNameAsync', () => {
        it.each<[string, string, string, boolean, boolean]>([
            ['rejects a blank name', '  ', null, false, false],
            ['rejects the name of an owned view', ' My Positions ', null, false, false],
            [
                'accepts the current name of a view being renamed',
                'My Positions',
                'mine',
                false,
                true
            ],
            ["accepts the name of another user's shared view", 'Bob Risk', null, false, true],
            [
                'accepts the name of a global view for a personal view',
                'Firm Standard',
                null,
                false,
                true
            ],
            // 72.0.0 (2d7e67aa6) - global view names were not checked against other global views.
            [
                'rejects the name of a global view for a global view',
                'Firm Standard',
                null,
                true,
                false
            ]
        ])('%s', async (_, name, token, isGlobal, isValid) => {
            const vmm = await createAsync(),
                existing = vmm.views.find(it => it.token === token) ?? null;

            const error = await vmm.validateViewNameAsync(name, existing, isGlobal);
            expect(error).toEqual(isValid ? null : expect.any(String));
        });
    });

    describe('views', () => {
        it('classifies views as owned, shared with the user, or global', async () => {
            views.add('desk', 'Desk View', {group: ' Desks / Rates '});
            const vmm = await createAsync();

            expect(names(vmm.ownedViews)).toEqual(['My Positions', 'Desk View']);
            expect(names(vmm.sharedViews)).toEqual(['Bob Risk']);
            expect(names(vmm.globalViews)).toEqual(['Firm Standard']);
            // Groups typed before paths were normalized still group together.
            expect(vmm.views.find(it => it.token === 'desk').group).toBe('Desks/Rates');
        });

        it('pins owned and global views by default, and saves user pins after 1s', async () => {
            Object.assign(views.state, {currentView: 'mine', userPinned: {firm: false}});
            const vmm = await createAsync();
            expect(names(vmm.pinnedViews)).toEqual(['My Positions']);

            vi.useFakeTimers();
            vmm.userPin(vmm.views.find(it => it.token === 'bobs'));
            expect(names(vmm.pinnedViews)).toEqual(['My Positions', 'Bob Risk']);

            await vi.advanceTimersByTimeAsync(999);
            expect(hoistCore.requestsTo('xhView/updateState')).toHaveLength(0);
            await vi.advanceTimersByTimeAsync(1);
            await vi.waitFor(() =>
                expect(hoistCore.requestsTo('xhView/updateState')).toHaveLength(1)
            );
            expect(hoistCore.requestsTo('xhView/updateState')[0].json).toEqual({
                userPinned: {firm: false, bobs: true}
            });
        });
    });

    describe('persistWith', () => {
        it('applies the selected view to bound models, and records their changes', async () => {
            views.state.currentView = 'mine';
            const vmm = await createAsync();
            class PositionsModel extends HoistModel {
                // No write debounce, so changes reach the view manager as they are made.
                override persistWith = {viewManagerModel: vmm, debounce: 0};
                @bindable @persist accessor sortBy = 'symbol';
            }
            const model = new PositionsModel();
            onTestFinished(() => model.destroy());
            expect(model.sortBy).toBe('pnl');

            await vmm.selectViewAsync('firm');
            expect(model.sortBy).toBe('sector');

            // The in-code default view restores the model's own initial state.
            await vmm.selectViewAsync(null);
            expect(model.sortBy).toBe('symbol');

            model.sortBy = 'name';
            expect(vmm.isValueDirty).toBe(true);
            expect(vmm.getValue()).toEqual({sortBy: 'name'});
        });
    });
});

//------------------
// Test support
//------------------
const TYPE = 'portfolioGrid',
    // A time on a whole second, which ViewInfo's rounding of server dates leaves unchanged.
    T0 = 1_767_000_000_000;

async function createAsync(config: Partial<ViewManagerConfig> = {}): Promise<ViewManagerModel> {
    const ret = await ViewManagerModel.createAsync({type: TYPE, ...config});
    onTestFinished(() => ret.destroy());
    return ret;
}

function firstGlobalView(views: ViewInfo[]): ViewInfo {
    return views.find(it => it.isGlobal);
}

function names(views: ViewInfo[]): string[] {
    return views.map(it => it.name);
}

interface ViewOptions {
    owner?: string;
    isShared?: boolean;
    group?: string;
    value?: PlainObject;
}

/**
 * In-memory stand-in for hoist-core's `XhViewController`, answering as its `ViewService` does -
 * views are JsonBlobs rendered by `JsonBlob.formatForClient`. Requests are recorded alongside the
 * fake's own, for `hoistCore.requestsTo()`.
 */
class ViewServer {
    blobs: JsonBlob[] = [];
    state: PlainObject = {userPinned: {}, autoSave: false};
    manageGlobal: boolean = false;

    private failLoad = false;
    private gate: Promise<void> = null;
    private pending = new Set<Promise<Response>>();

    add(token: string, name: string, opts: ViewOptions = {}): JsonBlob {
        const ret = this.createBlob(token, name, opts);
        this.blobs.push(ret);
        return ret;
    }

    get(token: string): JsonBlob {
        return this.blobs.find(it => it.token === token);
    }

    /** Answer the next `xhView/allData` with a server error. */
    failNextLoad() {
        this.failLoad = true;
    }

    /** Hold responses until the returned function is called. */
    holdResponses(): () => void {
        let release: () => void;
        this.gate = new Promise(resolve => (release = resolve));
        return () => {
            this.gate = null;
            release();
        };
    }

    /** Wait until the client has sent no new request, and every request has been answered. */
    async settleAsync() {
        // A request reaches MSW within a few event-loop turns of being sent - no real I/O is
        // involved. Repeat while answers lead to further requests, e.g. a refresh after a save.
        let count: number;
        do {
            count = hoistCore.requests.length;
            for (let i = 0; i < 3; i++) await wait();
            await Promise.all(this.pending);
        } while (hoistCore.requests.length !== count);
    }

    get handlers() {
        return [
            this.post('xhView/allData', () => {
                if (this.failLoad) {
                    this.failLoad = false;
                    return hoistError(500, {message: 'Database unavailable'});
                }
                return HttpResponse.json({
                    state: this.state,
                    views: this.blobs.map(it => omit(it, 'value')),
                    manageGlobal: this.manageGlobal
                });
            }),

            this.post('xhView/get', req => HttpResponse.json(this.get(req.form.token))),

            // ViewService.create
            this.post('xhView/create', ({json}) => {
                const {name, group, isShared, isGlobal, value, description} = json,
                    ret = this.add(`new${this.blobs.length}`, name, {
                        owner: isGlobal ? null : hoistCore.username,
                        isShared,
                        group,
                        value
                    });
                ret.description = description;
                return HttpResponse.json(ret);
            }),

            this.post('xhView/updateValue', ({query, json}) => {
                const ret = this.get(query.token);
                ret.value = json;
                ret.lastUpdated += 1000;
                return HttpResponse.json(ret);
            }),

            this.post('xhView/delete', ({query}) => {
                const tokens = query.tokens.split(',');
                this.blobs = this.blobs.filter(it => !tokens.includes(it.token));
                return new HttpResponse(null, {status: 204});
            }),

            // ViewService.updateState - merges each given key, returning the new state.
            this.post('xhView/updateState', ({json}) => {
                const {userPinned, ...rest} = json;
                Object.assign(this.state, rest);
                if (userPinned) this.state.userPinned = {...this.state.userPinned, ...userPinned};
                return HttpResponse.json(this.state);
            })
        ];
    }

    //------------------
    // Implementation
    //------------------
    private createBlob(token: string, name: string, opts: ViewOptions): JsonBlob {
        const {owner = hoistCore.username, isShared = false, group = null, value = {}} = opts;
        return {
            id: this.blobs.length + 1,
            token,
            type: TYPE,
            owner,
            acl: owner && !isShared ? null : '*',
            name,
            archived: false,
            archivedDate: 0,
            description: null,
            dateCreated: T0,
            lastUpdated: T0,
            lastUpdatedBy: owner ?? 'admin',
            meta: owner ? {group, isShared} : {group},
            value
        };
    }

    private post(path: string, fn: (req: RecordedRequest) => Response) {
        return http.post(xhUrl(path), ({request}) => {
            const ret = this.serveAsync(path, request, fn);
            this.pending.add(ret);
            return ret.finally(() => this.pending.delete(ret));
        });
    }

    private async serveAsync(
        path: string,
        request: Request,
        fn: (req: RecordedRequest) => Response
    ): Promise<Response> {
        const url = new URL(request.url),
            body = await request.text(),
            isJson = request.headers.get('Content-Type')?.includes('application/json'),
            req: RecordedRequest = {
                method: request.method,
                path,
                query: Object.fromEntries(url.searchParams),
                form: body && !isJson ? Object.fromEntries(new URLSearchParams(body)) : {},
                json: body && isJson ? JSON.parse(body) : null,
                headers: {}
            };
        hoistCore.requests.push(req);
        await this.gate;
        return fn(req);
    }
}
