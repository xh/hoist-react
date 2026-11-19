/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ViewManagerModel} from '@xh/hoist/cmp/viewmanager';
import {type PlainObject, XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync, TestAppModel} from '@xh/hoist/test-support';
import {beforeAll, beforeEach, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The fake hoist-core's JsonBlob store, behind `XH.jsonBlobService` and the `xhView` endpoints
 * that `ViewManagerModel` calls. Apps create view managers at boot and persist grid and dashboard
 * state through them, so app specs depend on these endpoints answering as hoist-core's
 * `JsonBlobService` and `ViewService` do. Expected values follow hoist-core's own specs for both.
 */
describe('FakeJsonBlobStore', () => {
    const {jsonBlobs} = hoistCore;
    let bootViewManager: ViewManagerModel;

    // Creates a view manager at boot, as apps do from AppModel.initAsync().
    class ViewsAppModel extends TestAppModel {
        override async initAsync() {
            bootViewManager = await ViewManagerModel.createAsync({type: 'appLayout'});
        }
    }

    beforeAll(() => initTestAppAsync({modelClass: ViewsAppModel}));

    beforeEach(() => {
        jsonBlobs.clear();
        vi.useFakeTimers({now: T0, toFake: ['Date']});
    });

    it('serves a view manager created at boot, with no setup', () => {
        expect(bootViewManager.view.isDefault).toBe(true);
        expect(bootViewManager.views).toEqual([]);
    });

    //------------------------
    // XH.jsonBlobService
    //------------------------
    describe('JsonBlob endpoints', () => {
        it('creates a blob owned by the user, rendered as hoist-core renders it', async () => {
            const ret = await XH.jsonBlobService.createAsync({
                type: 'grid',
                name: 'mine',
                value: {a: 1},
                meta: {group: 'G'},
                description: 'd'
            });

            expect(ret).toEqual({
                id: expect.any(Number),
                token: expect.any(String),
                type: 'grid',
                owner: 'jdoe',
                acl: null,
                name: 'mine',
                archived: false,
                archivedDate: 0,
                description: 'd',
                dateCreated: T0,
                lastUpdated: T0,
                lastUpdatedBy: 'jdoe',
                meta: {group: 'G'},
                value: {a: 1}
            });
            expect(jsonBlobs.get(ret.token).value).toEqual({a: 1});
        });

        it('lists the active blobs of a type that the user can read', async () => {
            jsonBlobs.add({type: 'grid', name: 'mine', value: {a: 1}});
            jsonBlobs.add({type: 'grid', name: 'shared', owner: 'bsmith', acl: '*'});
            jsonBlobs.add({type: 'grid', name: 'private', owner: 'bsmith'});
            jsonBlobs.add({type: 'chart', name: 'other type'});
            const archived = jsonBlobs.add({type: 'grid', name: 'old'});
            await XH.jsonBlobService.archiveAsync(archived.token);

            const list = await XH.jsonBlobService.listAsync({type: 'grid'});
            expect(list.map(it => it.name)).toEqual(['mine', 'shared']);
            expect(list[0]).not.toHaveProperty('value');

            const withValues = await XH.jsonBlobService.listAsync({
                type: 'grid',
                includeValue: true
            });
            expect(withValues[0].value).toEqual({a: 1});
        });

        it('gets a blob the user can read', async () => {
            const shared = jsonBlobs.add({
                type: 'grid',
                name: 'shared',
                owner: 'bsmith',
                acl: '*',
                value: {b: 2}
            });

            const ret = await XH.jsonBlobService.getAsync(shared.token);
            expect(ret).toMatchObject({name: 'shared', owner: 'bsmith', value: {b: 2}});
        });

        it('rejects a get of an unknown token as hoist-core does', async () => {
            await expect(XH.jsonBlobService.getAsync('nope')).rejects.toMatchObject({
                httpStatus: 500,
                name: 'RuntimeException',
                message: "Active JsonBlob not found with token 'nope'",
                isRoutine: false
            });
        });

        it("rejects a get of another user's private blob as hoist-core does", async () => {
            const bobs = jsonBlobs.add({type: 'grid', name: 'private', owner: 'bsmith'});

            await expect(XH.jsonBlobService.getAsync(bobs.token)).rejects.toMatchObject({
                httpStatus: 403,
                name: 'NotAuthorizedException',
                message: `User 'jdoe' does not have access to JsonBlob with token '${bobs.token}'`,
                isRoutine: true
            });
        });

        it('updates the given fields and stamps the update', async () => {
            const blob = jsonBlobs.add({type: 'grid', name: 'mine', value: {a: 1}});
            vi.setSystemTime(T0 + 5000);

            const ret = await XH.jsonBlobService.updateAsync(blob.token, {
                name: 'renamed',
                value: {a: 2}
            });

            expect(ret).toMatchObject({
                token: blob.token,
                name: 'renamed',
                value: {a: 2},
                dateCreated: T0,
                lastUpdated: T0 + 5000,
                lastUpdatedBy: 'jdoe'
            });
        });

        it('creates a blob on the first createOrUpdate, and updates it thereafter', async () => {
            const created = await XH.jsonBlobService.createOrUpdateAsync('grid', 'mine', {
                value: {a: 1}
            });
            const updated = await XH.jsonBlobService.createOrUpdateAsync('grid', 'mine', {
                value: {a: 2}
            });

            expect(updated.token).toBe(created.token);
            expect(updated.value).toEqual({a: 2});
            const list = await XH.jsonBlobService.listAsync({type: 'grid'});
            expect(list).toHaveLength(1);
        });

        it('finds a blob by type, name and the owner the request names', async () => {
            jsonBlobs.add({type: 'grid', name: 'layout', value: {a: 1}});
            jsonBlobs.add({type: 'grid', name: 'layout', owner: null, acl: '*', value: {g: 1}});

            const findAsync = (params: PlainObject) =>
                XH.fetchJson({url: 'xh/findJsonBlob', params: {type: 'grid', ...params}});

            expect((await findAsync({name: 'layout', owner: 'jdoe'})).value).toEqual({a: 1});
            // XhController.findJsonBlob binds an absent `owner` param as null - the global owner.
            expect((await findAsync({name: 'layout'})).value).toEqual({g: 1});
            expect(await findAsync({name: 'missing', owner: 'jdoe'})).toBeNull();
        });

        it('archives a blob, which then fails a get', async () => {
            const blob = jsonBlobs.add({type: 'grid', name: 'mine'});

            const ret = await XH.jsonBlobService.archiveAsync(blob.token);

            expect(ret).toMatchObject({archived: true, archivedDate: T0, lastUpdatedBy: 'jdoe'});
            await expect(XH.jsonBlobService.getAsync(blob.token)).rejects.toMatchObject({
                httpStatus: 500
            });
        });

        it('records the authenticated user as the archiver while impersonating', async () => {
            const blob = jsonBlobs.add({type: 'grid', name: 'mine'});
            hoistCore.authUser = {username: 'admin'};
            onTestFinished(() => (hoistCore.authUser = null));

            const ret = await XH.jsonBlobService.archiveAsync(blob.token);

            expect(ret.lastUpdatedBy).toBe('admin');
        });
    });

    //------------------------
    // ViewManager
    //------------------------
    describe('view endpoints', () => {
        it('loads an empty library and default state for a type with no views', async () => {
            expect(await allDataAsync()).toEqual({
                state: {userPinned: {}, autoSave: false},
                views: [],
                manageGlobal: false
            });
        });

        it('loads the views the user can read, without values, and their state', async () => {
            const mine = jsonBlobs.addView({type: TYPE, name: 'My Positions', value: {s: 1}});
            jsonBlobs.addView({type: TYPE, name: 'Bob Risk', owner: 'bsmith', isShared: true});
            jsonBlobs.addView({type: TYPE, name: 'Bob Private', owner: 'bsmith'});
            jsonBlobs.addView({type: TYPE, name: 'Firm Standard', isGlobal: true});
            jsonBlobs.addView({type: 'otherType', name: 'Other'});
            jsonBlobs.setViewState(
                TYPE,
                {currentView: mine.token, autoSave: true},
                {viewInstance: 'main'}
            );

            const data = await allDataAsync('main');

            expect(data.views.map(it => it.name)).toEqual([
                'My Positions',
                'Bob Risk',
                'Firm Standard'
            ]);
            expect(data.views[0]).not.toHaveProperty('value');
            expect(data.state).toEqual({userPinned: {}, autoSave: true, currentView: mine.token});
        });

        it.each<[string, string[], PlainObject, boolean]>([
            ['denies a user without the default role', ['APP_USER'], undefined, false],
            ['allows a HOIST_ADMIN by default', ['HOIST_ADMIN'], undefined, true],
            ['allows anyone when the type lists the * role', ['APP_USER'], {[TYPE]: ['*']}, true],
            ['denies everyone when the type lists no roles', ['HOIST_ADMIN'], {[TYPE]: []}, false]
        ])('manageGlobal %s', async (_, roles, globalWriteRoles, expected) => {
            const prevRoles = hoistCore.roles,
                prevWriteRoles = jsonBlobs.globalWriteRoles;
            hoistCore.roles = roles;
            if (globalWriteRoles) jsonBlobs.globalWriteRoles = globalWriteRoles;
            onTestFinished(() => {
                hoistCore.roles = prevRoles;
                jsonBlobs.globalWriteRoles = prevWriteRoles;
            });

            expect((await allDataAsync()).manageGlobal).toBe(expected);
        });

        it.each<[string, PlainObject, PlainObject]>([
            [
                'a private view, owned by the user',
                {},
                {owner: 'jdoe', acl: null, meta: {group: 'G', isShared: null}}
            ],
            [
                'a shared view, readable by all',
                {isShared: true},
                {owner: 'jdoe', acl: '*', meta: {group: 'G', isShared: true}}
            ],
            [
                'a global view, with no owner',
                {isGlobal: true},
                {owner: null, acl: '*', meta: {group: 'G'}}
            ]
        ])('creates %s', async (_, spec, expected) => {
            const ret = await XH.postJson({
                url: 'xhView/create',
                body: {type: TYPE, name: 'V', description: 'd', group: 'G', value: {c: 1}, ...spec}
            });

            expect(ret).toMatchObject({
                type: TYPE,
                name: 'V',
                description: 'd',
                value: {c: 1},
                ...expected
            });
            expect((await allDataAsync()).views.map(it => it.token)).toEqual([ret.token]);
        });

        it('records isPinned from a create in the user state', async () => {
            const ret = await XH.postJson({
                url: 'xhView/create',
                body: {type: TYPE, name: 'Mine', value: {}, isPinned: true}
            });

            expect((await allDataAsync()).state.userPinned).toEqual({[ret.token]: true});
        });

        it('gets a view with its value', async () => {
            const view = jsonBlobs.addView({type: TYPE, name: 'Mine', value: {s: 1}});

            const ret = await XH.fetchJson({url: 'xhView/get', params: {token: view.token}});

            expect(ret).toMatchObject({token: view.token, name: 'Mine', value: {s: 1}});
        });

        it('keeps the current view per instance, and prunes pins to existing views', async () => {
            const a = jsonBlobs.addView({type: TYPE, name: 'A'}),
                b = jsonBlobs.addView({type: TYPE, name: 'B'});

            await updateStateAsync('left', {currentView: a.token});
            let state = await updateStateAsync('right', {
                currentView: b.token,
                userPinned: {[a.token]: true, [b.token]: false, ghost: true}
            });

            expect(state).toEqual({
                userPinned: {[a.token]: true, [b.token]: false},
                autoSave: false,
                currentView: b.token
            });
            expect((await allDataAsync('left')).state.currentView).toBe(a.token);
            expect((await allDataAsync('other')).state).not.toHaveProperty('currentView');

            state = await updateStateAsync('right', {userPinned: {[b.token]: true}});
            expect(state.userPinned).toEqual({[a.token]: true, [b.token]: true});
        });

        it('keeps a current view of null, for a user who chose the default view', async () => {
            await updateStateAsync('default', {currentView: null});

            expect((await allDataAsync()).state).toEqual({
                userPinned: {},
                autoSave: false,
                currentView: null
            });
        });

        it('updates name, description and group, and records isPinned', async () => {
            const view = jsonBlobs.addView({
                type: TYPE,
                name: 'Old',
                description: 'd',
                group: 'G1'
            });

            const ret = await XH.postJson({
                url: 'xhView/updateInfo',
                params: {token: view.token},
                body: {name: 'New', description: 'd2', group: 'G2', isPinned: true}
            });

            expect(ret).toMatchObject({
                name: 'New',
                description: 'd2',
                meta: {group: 'G2', isShared: null}
            });
            expect((await allDataAsync()).state.userPinned).toEqual({[view.token]: true});
        });

        it('shares, unshares and promotes a view to global', async () => {
            const view = jsonBlobs.addView({type: TYPE, name: 'V', group: 'G'}),
                updateInfoAsync = (body: PlainObject) =>
                    XH.postJson({url: 'xhView/updateInfo', params: {token: view.token}, body});

            expect(await updateInfoAsync({isShared: true})).toMatchObject({
                owner: 'jdoe',
                acl: '*',
                meta: {group: 'G', isShared: true}
            });
            expect(await updateInfoAsync({isShared: false})).toMatchObject({
                owner: 'jdoe',
                acl: null,
                meta: {group: 'G', isShared: false}
            });
            const global = await updateInfoAsync({isGlobal: true});
            expect(global).toMatchObject({owner: null, acl: '*'});
            expect(global.meta).toEqual({group: 'G'});
        });

        it('updates each view in a bulk update, and pins them once per type', async () => {
            const a = jsonBlobs.addView({type: TYPE, name: 'A'}),
                b = jsonBlobs.addView({type: 'otherType', name: 'B'});

            await XH.postJson({
                url: 'xhView/bulkUpdateInfo',
                params: {tokens: `${a.token},${b.token}`},
                body: {group: 'Moved', isPinned: true}
            });

            expect(jsonBlobs.get(a.token).meta.group).toBe('Moved');
            expect(jsonBlobs.get(b.token).meta.group).toBe('Moved');
            expect(jsonBlobs.viewState(TYPE).userPinned).toEqual({[a.token]: true});
            expect(jsonBlobs.viewState('otherType').userPinned).toEqual({[b.token]: true});
        });

        it('updates the views it can read in a bulk update, then reports the rest', async () => {
            const a = jsonBlobs.addView({type: TYPE, name: 'A'}),
                bobs = jsonBlobs.addView({type: TYPE, name: 'Bobs', owner: 'bsmith'});

            const update = XH.postJson({
                url: 'xhView/bulkUpdateInfo',
                params: {tokens: `${a.token},${bobs.token}`},
                body: {group: 'Moved'}
            });

            await expect(update).rejects.toMatchObject({
                httpStatus: 400,
                name: 'RoutineRuntimeException',
                isRoutine: true,
                message: expect.stringContaining(`Failed to update 1 of 2 view(s) - ${bobs.token}`)
            });
            expect(jsonBlobs.get(a.token).meta.group).toBe('Moved');
        });

        it('replaces the value of a view and stamps the update', async () => {
            const view = jsonBlobs.addView({type: TYPE, name: 'Mine', value: {v: 1}});
            vi.setSystemTime(T0 + 5000);

            const ret = await XH.postJson({
                url: 'xhView/updateValue',
                params: {token: view.token},
                body: {v: 2}
            });

            expect(ret).toMatchObject({value: {v: 2}, lastUpdated: T0 + 5000});
            expect(jsonBlobs.get(view.token).value).toEqual({v: 2});
        });

        it('deletes the views it can, then reports the rest', async () => {
            const a = jsonBlobs.addView({type: TYPE, name: 'A'});

            const del = XH.postJson({url: 'xhView/delete', params: {tokens: `${a.token},nope`}});

            await expect(del).rejects.toMatchObject({
                httpStatus: 500,
                name: 'RuntimeException',
                message:
                    "Failed to delete 1 view(s) - Active JsonBlob not found with token 'nope' " +
                    "(Caused by: Active JsonBlob not found with token 'nope')"
            });
            expect((await allDataAsync()).views).toEqual([]);
        });

        it("renames a group through the user's own views only", async () => {
            const a = jsonBlobs.addView({type: TYPE, name: 'A', group: 'Reports/Sales'}),
                b = jsonBlobs.addView({type: TYPE, name: 'B', group: 'Reports/Sales/Monthly'}),
                c = jsonBlobs.addView({type: TYPE, name: 'C', group: 'Reports/Salesforce'}),
                global = jsonBlobs.addView({
                    type: TYPE,
                    name: 'G',
                    group: 'Reports/Sales',
                    isGlobal: true
                });

            const ret = await XH.postJson({
                url: 'xhView/renameGroup',
                params: {type: TYPE},
                body: {from: 'Reports/Sales', to: 'Archive/Sales', isGlobal: false}
            });

            expect(ret).toEqual({count: 2});
            expect(jsonBlobs.get(a.token).meta.group).toBe('Archive/Sales');
            expect(jsonBlobs.get(b.token).meta.group).toBe('Archive/Sales/Monthly');
            expect(jsonBlobs.get(c.token).meta.group).toBe('Reports/Salesforce');
            expect(jsonBlobs.get(global.token).meta.group).toBe('Reports/Sales');
        });

        it("clears the user's view state, but not their views, on restore defaults", async () => {
            const view = jsonBlobs.addView({type: TYPE, name: 'Mine'});
            jsonBlobs.setViewState(TYPE, {currentView: view.token, autoSave: true});

            await XH.appModel.restoreDefaultsAsync();

            expect(await allDataAsync()).toMatchObject({
                state: {userPinned: {}, autoSave: false},
                views: [{token: view.token}]
            });
        });
    });
});

//------------------
// Test support
//------------------
const TYPE = 'portfolioGrid',
    T0 = 1_767_000_000_000;

function allDataAsync(viewInstance: string = 'default') {
    return XH.fetchJson({url: 'xhView/allData', params: {type: TYPE, viewInstance}});
}

function updateStateAsync(viewInstance: string, body: PlainObject) {
    return XH.postJson({url: 'xhView/updateState', params: {type: TYPE, viewInstance}, body});
}
