/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {MessageModel} from '@xh/hoist/appcontainer/MessageModel';
import {XH} from '@xh/hoist/core';
import {RestGridConfig, RestGridModel} from '@xh/hoist/desktop/cmp/rest';
import {initTestAppAsync, server, xhUrl} from '@xh/hoist/test';
import {http, HttpResponse} from 'msw';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';

/**
 * The record editor and delete flows of a RestGrid, driven as its form and toolbar buttons do,
 * against a stand-in hoist-core RestController. The Admin Console edits configs and preferences
 * for every Hoist app this way, so what the form sends is written straight to shared server data.
 */
describe('RestGridModel', () => {
    beforeAll(async () => {
        await initTestAppAsync();
    });

    describe('editing a record', () => {
        it('saves only the fields the user changed, then closes the form', async () => {
            const model = createModel(),
                sent = serve('rest/preferenceAdmin/7', req =>
                    HttpResponse.json({data: {...PAGE_SIZE, ...JSON.parse(req.body).data}})
                );

            model.editRecord(model.store.getById(7));
            field(model, 'notes').setValue('Rows per page');
            await model.formModel.validateAndSaveAsync();

            expect(JSON.parse(sent[0].body)).toEqual({data: {notes: 'Rows per page', id: 7}});
            expect(model.store.getById(7).data.notes).toBe('Rows per page');
            expect(model.formModel.isOpen).toBe(false);
        });

        it("locks fields marked editable: 'onAdd' once the record exists", () => {
            const model = createModel();

            model.addRecord();
            expect(field(model, 'type').readonly).toBe(false);

            model.editRecord(model.store.getById(7));
            expect(field(model, 'type').readonly).toBe(true);
            expect(field(model, 'name').readonly).toBe(false);
        });

        it('confirms an edit with actionWarning.edit, saving nothing if cancelled', async () => {
            // No PUT handler is served - a save request would fail the test.
            const model = createModel({actionWarning: {edit: 'Applies to all users.'}}),
                confirm = vi.spyOn(XH, 'confirm').mockResolvedValue(false);

            model.editRecord(model.store.getById(7));
            field(model, 'defaultValue').setValue(100);
            await model.formModel.validateAndSaveAsync();

            expect(confirm.mock.lastCall[0].message).toBe('Applies to all users.');
            expect(model.formModel.isOpen).toBe(true);
        });

        // v64.0.0 - a falsy result from an actionWarning function skips the prompt.
        it('saves without asking when an actionWarning function returns nothing', async () => {
            const model = createModel({actionWarning: {edit: () => null}}),
                confirm = vi.spyOn(XH, 'confirm').mockResolvedValue(true),
                sent = serve('rest/preferenceAdmin/7', () => HttpResponse.json({data: PAGE_SIZE}));

            model.editRecord(model.store.getById(7));
            field(model, 'defaultValue').setValue(100);
            await model.formModel.validateAndSaveAsync();

            expect(confirm).not.toHaveBeenCalled();
            expect(sent).toHaveLength(1);
        });
    });

    describe('adding a record', () => {
        it('sends every editable field, starting from field defaults', async () => {
            const model = createModel(),
                sent = serve('rest/preferenceAdmin', req =>
                    HttpResponse.json({data: {...JSON.parse(req.body).data, id: 9}})
                );

            model.addRecord();
            setValues(model, {name: 'theme', groupName: 'Look', type: 'string'});
            field(model, 'defaultValue').setValue('dark');
            await model.formModel.validateAndSaveAsync();

            expect(JSON.parse(sent[0].body).data).toEqual({
                name: 'theme',
                groupName: 'Look',
                type: 'string',
                defaultValue: 'dark',
                local: false,
                notes: null
            });
            expect(model.store.getById(9)).toBeDefined();
        });
    });

    describe('typeField', () => {
        it('sets the input type from the type field, clearing the value when it changes', () => {
            const model = createModel();

            model.editRecord(model.store.getById(7));
            expect(model.formModel.types.defaultValue).toBe('number');
            expect(field(model, 'defaultValue').value).toBe(50);

            model.addRecord();
            field(model, 'type').setValue('json');
            field(model, 'defaultValue').setValue('{}');
            field(model, 'type').setValue('bool');

            expect(model.formModel.types.defaultValue).toBe('bool');
            expect(field(model, 'defaultValue').value).toBeNull();
        });

        it('requires a json-typed value to be valid JSON before saving', async () => {
            const model = createModel(),
                dangerToast = vi.spyOn(XH, 'dangerToast').mockReturnValue(null);

            model.addRecord();
            setValues(model, {name: 'gridDefaults', groupName: 'Grids', type: 'json'});
            field(model, 'defaultValue').setValue('{"pageSize": 50');
            await model.formModel.validateAndSaveAsync();

            expect(dangerToast).toHaveBeenCalledOnce();
            expect(model.formModel.isOpen).toBe(true);

            const sent = serve('rest/preferenceAdmin', req =>
                HttpResponse.json({data: {...JSON.parse(req.body).data, id: 9}})
            );
            field(model, 'defaultValue').setValue('{"pageSize": 50}');
            await model.formModel.validateAndSaveAsync();

            expect(sent).toHaveLength(1);
        });
    });

    describe('confirmDeleteRecords', () => {
        it('deletes several selected records in one bulk request, warning of failures', async () => {
            const model = createModel(),
                bulkDelete = vi.spyOn(model, 'bulkDeleteRecordsAsync'),
                toast = vi.spyOn(XH, 'toast').mockReturnValue(null),
                sent = serve('rest/preferenceAdmin/bulkDelete', () =>
                    HttpResponse.json({success: 1, fail: 1})
                );
            serve('rest/preferenceAdmin', () => HttpResponse.json({data: [PAGE_SIZE]}));

            model.selModel.select(model.store.records);
            model.confirmDeleteRecords();
            await openMessage().doConfirmAsync();
            await bulkDelete.mock.results[0].value;

            expect(sent[0].body).toBe('ids=7&ids=8');
            expect(toast.mock.lastCall[0]).toMatchObject({intent: 'warning'});
            expect(model.store.records).toHaveLength(1);
        });
    });
});

const PAGE_SIZE = {
    id: 7,
    name: 'pageSize',
    groupName: 'Grids',
    type: 'int',
    defaultValue: 50,
    local: false,
    notes: null,
    lastUpdatedBy: 'jdoe'
};

// A RestGrid editing user preferences, as in the Admin Console, loaded with two of them.
function createModel(config: Partial<RestGridConfig> = {}): RestGridModel {
    const ret = new RestGridModel({
        unit: 'preference',
        selModel: 'multiple',
        store: {
            url: 'rest/preferenceAdmin',
            fields: [
                {name: 'name', type: 'string', required: true},
                {name: 'groupName', type: 'string', required: true},
                {name: 'type', type: 'string', editable: 'onAdd', required: true},
                {name: 'defaultValue', typeField: 'type', required: true},
                {name: 'local', type: 'bool', defaultValue: false},
                {name: 'notes', type: 'string'},
                {name: 'lastUpdatedBy', type: 'string', editable: false}
            ]
        },
        columns: [{field: 'name'}, {field: 'type'}, {field: 'defaultValue'}],
        editors: [
            {field: 'name'},
            {field: 'groupName'},
            {field: 'type'},
            {field: 'defaultValue'},
            {field: 'local'},
            {field: 'notes'},
            {field: 'lastUpdatedBy'}
        ],
        ...config
    });
    ret.loadData([{...PAGE_SIZE}, {...PAGE_SIZE, id: 8, name: 'theme', type: 'string'}]);
    onTestFinished(() => ret.destroy());
    return ret;
}

// The confirm dialog a user would be looking at.
function openMessage(): MessageModel {
    return XH.appContainerModel.messageSourceModel.msgModels.find(it => it.isOpen);
}

function field(model: RestGridModel, name: string) {
    return model.formModel.getFormFieldModel(name);
}

function setValues(model: RestGridModel, values: Record<string, unknown>) {
    model.formModel.formModel.setValues(values);
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
