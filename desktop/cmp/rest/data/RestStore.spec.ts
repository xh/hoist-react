/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {RestStore, RestStoreConfig} from '@xh/hoist/desktop/cmp/rest';
import {initTestAppAsync, server, xhUrl} from '@xh/hoist/test';
import {http, HttpResponse} from 'msw';
import {beforeAll, describe, expect, it, onTestFinished} from 'vitest';

/**
 * RestStore is the client half of hoist-core's RestController, which backs the Admin Console's
 * config, preference and role editors, and app RestGrids. The controller binds what it receives
 * straight onto domain objects, so a change in what the client sends - an extra field, a missing
 * id, a differently encoded list - can corrupt server data without any error.
 */
describe('RestStore', () => {
    beforeAll(async () => {
        await initTestAppAsync();
    });

    describe('loadAsync', () => {
        it('loads lookups once, before the first load of records', async () => {
            const store = createStore({fields: [{name: 'groupName', lookupName: 'groupNames'}]}),
                lookups = serve('rest/preferenceAdmin/lookupData', () =>
                    HttpResponse.json({groupNames: ['Charts', 'Grids']})
                ),
                loads = serve('rest/preferenceAdmin', () =>
                    HttpResponse.json({data: [{id: 7, groupName: 'Grids'}]})
                );

            await store.loadAsync();
            await store.loadAsync();

            expect(lookups).toHaveLength(1);
            expect(loads).toHaveLength(2);
            expect(store.getField('groupName').lookup).toEqual(['Charts', 'Grids']);
            expect(store.getById(7).data.groupName).toBe('Grids');
        });

        it('reloads lookups with every load when reloadLookupsOnLoad is set', async () => {
            const store = createStore({
                    fields: [{name: 'groupName', lookupName: 'groupNames'}],
                    reloadLookupsOnLoad: true
                }),
                lookups = serve('rest/preferenceAdmin/lookupData', () =>
                    HttpResponse.json({groupNames: []})
                );
            serve('rest/preferenceAdmin', () => HttpResponse.json({data: []}));

            await store.loadAsync();
            await store.loadAsync();

            expect(lookups).toHaveLength(2);
        });
    });

    describe('addRecordAsync', () => {
        it('POSTs only editable fields, then adds the record the server returns', async () => {
            const store = createStore(),
                sent = serve('rest/preferenceAdmin', req =>
                    HttpResponse.json({
                        data: {...JSON.parse(req.body).data, id: 7, lastUpdatedBy: 'jdoe'}
                    })
                );

            const rec = await store.addRecordAsync({
                data: {name: 'pageSize', type: 'int', defaultValue: 50, lastUpdatedBy: 'other'}
            });

            expect(sent[0].method).toBe('POST');
            expect(JSON.parse(sent[0].body)).toEqual({
                data: {name: 'pageSize', type: 'int', defaultValue: 50}
            });
            expect(rec.id).toBe(7);
            expect(store.getById(7).data.lastUpdatedBy).toBe('jdoe');
        });
    });

    describe('saveRecordAsync', () => {
        it('PUTs to the record url, sending its id with the data', async () => {
            // RestController.update() looks up the object by the id in the body, not the url.
            const store = createStore();
            store.loadData([{...PAGE_SIZE}]);
            const sent = serve('rest/preferenceAdmin/7', () =>
                HttpResponse.json({data: {...PAGE_SIZE, defaultValue: 100}})
            );

            await store.saveRecordAsync({id: 7, data: {defaultValue: 100}});

            expect(sent[0].method).toBe('PUT');
            expect(JSON.parse(sent[0].body)).toEqual({data: {defaultValue: 100, id: 7}});
            expect(store.records).toHaveLength(1);
            expect(store.getById(7).data.defaultValue).toBe(100);
        });
    });

    describe('deleteRecordAsync', () => {
        it('sends a DELETE to the record url, then removes the record', async () => {
            const store = createStore();
            store.loadData([{...PAGE_SIZE}]);
            const sent = serve('rest/preferenceAdmin/7', () => noContent());

            await store.deleteRecordAsync(store.getById(7));

            expect(sent[0].method).toBe('DELETE');
            expect(store.getById(7)).toBeUndefined();
        });
    });

    describe('bulkDeleteRecordsAsync', () => {
        it('POSTs the ids as repeated form params, then reloads', async () => {
            // RestController.bulkDelete() reads the ids with params.list('ids').
            const store = createStore();
            store.loadData([{...PAGE_SIZE}, {...PAGE_SIZE, id: 8, name: 'theme'}]);
            const sent = serve('rest/preferenceAdmin/bulkDelete', () =>
                    HttpResponse.json({success: 2, fail: 0})
                ),
                loads = serve('rest/preferenceAdmin', () => HttpResponse.json({data: []}));

            const ret = await store.bulkDeleteRecordsAsync(store.records);

            expect(sent[0].method).toBe('POST');
            expect(sent[0].body).toBe('ids=7&ids=8');
            expect(ret).toEqual({success: 2, fail: 0});
            expect(loads).toHaveLength(1);
            expect(store.records).toHaveLength(0);
        });
    });

    describe('bulkUpdateRecordsAsync', () => {
        it('PUTs the ids and new values as JSON, then reloads', async () => {
            const store = createStore(),
                sent = serve('rest/preferenceAdmin/bulkUpdate', () =>
                    HttpResponse.json({success: 2, fail: 0})
                ),
                loads = serve('rest/preferenceAdmin', () => HttpResponse.json({data: []}));

            await store.bulkUpdateRecordsAsync([7, 8], {groupName: 'Layout'});

            expect(sent[0].method).toBe('PUT');
            expect(JSON.parse(sent[0].body)).toEqual({
                ids: [7, 8],
                newParams: {groupName: 'Layout'}
            });
            expect(loads).toHaveLength(1);
        });
    });
});

const PAGE_SIZE = {id: 7, name: 'pageSize', type: 'int', defaultValue: 50, lastUpdatedBy: 'jdoe'};

// A store for a RestController editing user preferences, as in the Admin Console.
function createStore(config: Partial<RestStoreConfig> = {}): RestStore {
    const ret = new RestStore({
        url: 'rest/preferenceAdmin',
        fields: [
            {name: 'name', type: 'string'},
            {name: 'type', type: 'string', editable: 'onAdd'},
            {name: 'defaultValue', typeField: 'type'},
            {name: 'lastUpdatedBy', type: 'string', editable: false}
        ],
        ...config
    });
    onTestFinished(() => ret.destroy());
    return ret;
}

interface SentRequest {
    method: string;
    body: string;
}

/** Serve one RestController url for the current test, recording the requests it receives. */
function serve(path: string, respond: (req: SentRequest) => Response): SentRequest[] {
    const ret: SentRequest[] = [];
    server.use(
        http.all(xhUrl(path), async ({request}) => {
            const req = {method: request.method, body: await request.text()};
            ret.push(req);
            return respond(req);
        })
    );
    return ret;
}

// RestController renders a successful delete as an empty 204.
function noContent(): Response {
    return new HttpResponse(null, {status: 204, headers: {'Content-Type': 'application/json'}});
}
