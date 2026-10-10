/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
// Load the Admin Console as an app does - ConfigPanelModel alone hits an import cycle.
import '@xh/hoist/admin/AppModel';
import {ConfigPanelModel} from '@xh/hoist/admin/tabs/general/config/ConfigPanelModel';
import {PlainObject, XH} from '@xh/hoist/core';
import {hoistCore, initTestAppAsync} from '@xh/hoist/test-support';
import {beforeAll, describe, expect, it, onTestFinished, vi} from 'vitest';
import {DifferModel} from './DifferModel';

/**
 * The Admin Console config differ, which compares configs across environments and writes remote
 * values into the local database. Pins what counts as a difference, so admins are not flooded with
 * false diffs, and which configs Apply Remote must never overwrite.
 */
describe('DifferModel', () => {
    beforeAll(async () => {
        await initTestAppAsync();
    });

    // Regression: hoist-core sends `resolvedValue` and `defaultValue` for typedClass configs,
    // derived from each instance's code. Environments on different versions flagged them all.
    it('ignores code-derived config values', () => {
        const model = diffConfigs(
            [{name: 'conf', resolvedValue: {a: 1}, defaultValue: {a: 1}}],
            [{name: 'conf', resolvedValue: {a: 1, b: 2}, defaultValue: {a: 2}}]
        );

        expect(statusOf(model, 'conf')).toBe('Identical');
    });

    it('compares JSON config values by content, not formatting', () => {
        const model = diffConfigs(
            [
                {name: 'reformatted', valueType: 'json', value: '{"a": 1, "b": 2}'},
                {name: 'changed', valueType: 'json', value: '{"a": 1}'}
            ],
            [
                {name: 'reformatted', valueType: 'json', value: '{\n  "b": 2,\n  "a": 1\n}'},
                {name: 'changed', valueType: 'json', value: '{"a": 2}'}
            ]
        );

        expect(statusOf(model, 'reformatted')).toBe('Identical');
        expect(statusOf(model, 'changed')).toBe('Diff');
    });

    it('never applies remote values to password or overridden configs', async () => {
        const configs = [
                {name: 'plain'},
                {name: 'secret', valueType: 'pwd'},
                {name: 'overridden', overrideValue: 'x'}
            ],
            model = diffConfigs(configs, configs);
        hoistCore.route('POST', 'configDiffAdmin/applyRemoteValues', () => ({success: true}));
        // Applying reloads the Config tab's grid.
        hoistCore.route('GET', 'rest/configAdmin', () => ({data: []}));
        hoistCore.route('GET', 'rest/configAdmin/lookupData', () => ({}));
        vi.spyOn(XH, 'confirm').mockImplementation(async ({onConfirm}) => {
            onConfirm();
            return true;
        });

        model.confirmApplyRemote(model.gridModel.store.allRecords);
        await hoistCore.settleAsync();

        const [req] = hoistCore.requestsTo('configDiffAdmin/applyRemoteValues');
        expect(JSON.parse(req.form.records).map(it => it.name)).toEqual(['plain']);
    });

    /** Diff local against remote configs in the differ the Config tab opens. */
    function diffConfigs(local: PlainObject[], remote: PlainObject[]) {
        const panelModel = new ConfigPanelModel();
        onTestFinished(() => panelModel.destroy());
        panelModel.openDiffer();

        const model = panelModel.differModel;
        model.processResponse([{data: local}, {data: remote}]);
        return model;
    }

    function statusOf(model: DifferModel, name: string) {
        return model.gridModel.store.getById(name).data.status;
    }
});
