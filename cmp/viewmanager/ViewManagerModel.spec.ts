/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {type ViewInfo, ViewManagerModel, type ViewManagerConfig} from '@xh/hoist/cmp/viewmanager';
import {HoistModel, persist, type PlainObject, XH} from '@xh/hoist/core';
import {bindable} from '@xh/hoist/mobx';
import {hoistCore, hoistError, initTestAppAsync, server, xhUrl} from '@xh/hoist/test-support';
import {http} from 'msw';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * ViewManagerModel run against the fake hoist-core's view endpoints: which view a user lands on, how
 * changes are tracked, saved and auto-saved, and the requests that carry them. Apps persist grid,
 * dashboard and filter state through these views, and the user's library of views lives only on
 * the server - a slip here loses or overwrites work users have saved.
 */
describe('ViewManagerModel', () => {
    const {jsonBlobs} = hoistCore;

    beforeAll(() => initTestAppAsync());

    beforeEach(() => {
        jsonBlobs.clear();
        addView('mine', 'My Positions', {value: {sortBy: 'pnl'}});
        addView('bobs', 'Bob Risk', {owner: 'bsmith', isShared: true});
        addView('firm', 'Firm Standard', {isGlobal: true, value: {sortBy: 'sector'}});
        XH.sessionStorageService.clear();
    });

    describe('createAsync', () => {
        it('loads views and user state for its type and instance', async () => {
            setState({autoSave: true});
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
            setState(state);
            const vmm = await createAsync({initialViewSpec: firstGlobalView, ...config});

            expect(vmm.view.token).toBe(token);
            expect(vmm.getValue()).toEqual(token ? jsonBlobs.get(token).value : {});
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
            failLoads();
            const handleException = vi.spyOn(XH, 'handleException').mockImplementation(() => {});

            const vmm = await createAsync({initialViewSpec: firstGlobalView});

            // Bound models read the value as soon as createAsync resolves.
            expect(vmm.view.isDefault).toBe(true);
            expect(vmm.getValue()).toEqual({});
            expect(handleException).toHaveBeenCalledOnce();
        });

        it("leaves the user's saved current view in place when views fail to load", async () => {
            setState({currentView: 'mine'});
            failLoads();
            vi.spyOn(XH, 'handleException').mockImplementation(() => {});

            await createAsync();
            await hoistCore.settleAsync();

            expect(jsonBlobs.viewState(TYPE).currentView).toBe('mine');
            expect(hoistCore.requestsTo('xhView/updateState')).toHaveLength(0);
        });
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
            if (fromServer === undefined) {
                hoistCore.route('POST', 'xhView/allData', () => ({
                    state: {userPinned: {}, autoSave: false},
                    views: []
                }));
            } else {
                allowGlobalWrites(fromServer);
            }
            const vmm = await createAsync({manageGlobal: config});

            expect(vmm.manageGlobal).toBe(expected);
        });
    });

    describe('setValue', () => {
        it('tracks unsaved changes against the value of the current view', async () => {
            setState({currentView: 'mine'});
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
            setState({currentView: 'mine'});
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
            setState({currentView: 'mine'});
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
            setState({currentView: 'mine'});
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

        it('keeps changes made while a save is in flight', async () => {
            setState({currentView: 'mine'});
            const vmm = await createAsync();
            vi.spyOn(XH, 'successToast').mockImplementation(() => null);
            vmm.setValue({sortBy: 'name'});

            const {arrived, release} = holdRequests('xhView/updateValue'),
                save = vmm.saveAsync();
            await arrived;
            vmm.setValue({sortBy: 'size'});
            release();
            await save;

            expect(vmm.view.value).toEqual({sortBy: 'name'});
            expect(vmm.getValue()).toEqual({sortBy: 'size'});
            expect(vmm.isValueDirty).toBe(true);
        });

        it('confirms before overwriting a view saved elsewhere since it was loaded', async () => {
            setState({currentView: 'mine'});
            const vmm = await createAsync(),
                confirm = vi.spyOn(XH, 'confirm').mockResolvedValue(false);
            vmm.setValue({sortBy: 'name'});
            jsonBlobs.get('mine').lastUpdated += 60_000;

            await vmm.saveAsync();

            expect(confirm).toHaveBeenCalledOnce();
            expect(hoistCore.requestsTo('xhView/updateValue')).toHaveLength(0);
            expect(vmm.isValueDirty).toBe(true);
        });

        it('confirms before changing a global view for all users', async () => {
            setState({currentView: 'firm'});
            allowGlobalWrites(true);
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
            setState({currentView: 'mine', autoSave: true});
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

        it('keeps changes made while an auto-save is in flight', async () => {
            setState({currentView: 'mine', autoSave: true});
            const vmm = await createAsync();
            vi.useFakeTimers();

            vmm.setValue({sortBy: 'name'});
            const {arrived, release} = holdRequests('xhView/updateValue');
            await vi.advanceTimersByTimeAsync(2000);
            await arrived;

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
            addView('mine2', 'My Risk');
            setState({currentView: 'mine'});
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
            addView('desk', 'Desk View', {group: ' Desks / Rates '});
            const vmm = await createAsync();

            expect(names(vmm.ownedViews)).toEqual(['My Positions', 'Desk View']);
            expect(names(vmm.sharedViews)).toEqual(['Bob Risk']);
            expect(names(vmm.globalViews)).toEqual(['Firm Standard']);
            // Groups typed before paths were normalized still group together.
            expect(vmm.views.find(it => it.token === 'desk').group).toBe('Desks/Rates');
        });

        it('pins owned and global views by default, and saves user pins after 1s', async () => {
            setState({currentView: 'mine', userPinned: {firm: false}});
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
            setState({currentView: 'mine'});
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
const TYPE = 'portfolioGrid';

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

function addView(token: string, name: string, spec: PlainObject = {}) {
    hoistCore.jsonBlobs.addView({type: TYPE, token, name, ...spec});
}

function setState(state: PlainObject) {
    hoistCore.jsonBlobs.setViewState(TYPE, state);
}

/** Answer every `xhView/allData` in this test with a server error. */
function failLoads() {
    hoistCore.route('POST', 'xhView/allData', () =>
        hoistError(500, {message: 'Database unavailable'})
    );
}

/** Let - or stop - any user write global views of this type, for this test only. */
function allowGlobalWrites(allow: boolean) {
    const {jsonBlobs} = hoistCore,
        prev = jsonBlobs.globalWriteRoles;
    jsonBlobs.globalWriteRoles = {[TYPE]: allow ? ['*'] : []};
    onTestFinished(() => {
        jsonBlobs.globalWriteRoles = prev;
    });
}

/**
 * Hold requests to a path until released, then let the fake serve them. `arrived` resolves when
 * the first request arrives - the fake records a request only once it serves it.
 */
function holdRequests(path: string): {arrived: Promise<void>; release: () => void} {
    let onArrived: () => void, release: () => void;
    const arrived = new Promise<void>(resolve => (onArrived = resolve)),
        gate = new Promise<void>(resolve => (release = resolve));
    server.use(
        http.post(xhUrl(path), async () => {
            onArrived();
            await gate;
            // Return nothing, so the request falls through to the fake's own handler.
        })
    );
    return {arrived, release};
}
