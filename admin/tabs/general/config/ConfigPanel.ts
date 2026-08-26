/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import * as AdminCol from '@xh/hoist/admin/columns';
import * as Col from '@xh/hoist/admin/columns/Rest';
import {jsonSearchButton} from '@xh/hoist/admin/jsonsearch/JsonSearch';
import {filler, fragment} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {RestFormModel} from '@xh/hoist/desktop/cmp/rest/impl/RestFormModel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {differ} from '../../../differ/Differ';
import {regroupDialog} from '../../../regroup/RegroupDialog';
import {ConfigPanelModel} from './ConfigPanelModel';

export const configPanel = hoistCmp.factory({
    model: creates(ConfigPanelModel),

    render({model}) {
        return fragment(
            restGrid({
                testId: 'config',
                formBbar: configFormBbar(),
                extraToolbarItems: () => [
                    button({
                        icon: Icon.diff(),
                        text: 'Compare w/ Remote',
                        onClick: () => model.openDiffer()
                    }),
                    toolbarSep(),
                    jsonSearchButton({
                        subjectName: 'Config',
                        docSearchUrl: 'jsonSearch/searchConfigs',
                        gridModelConfig: {
                            sortBy: ['groupName', 'name'],
                            columns: [
                                {...AdminCol.groupName},
                                {...AdminCol.name},
                                {
                                    field: {name: 'json', type: 'string'},
                                    hidden: true
                                },
                                {...Col.lastUpdated}
                            ]
                        },
                        groupByOptions: ['groupName']
                    })
                ]
            }),
            differ({omit: !model.differModel}),
            regroupDialog()
        );
    }
});

// Custom toolbar supports reverting the form, and leaving it open after change
const configFormBbar = hoistCmp.factory<RestFormModel>(({model}) => {
    const {formModel, actions, currentRecord, gridModel} = model,
        {isDirty, isValid, readonly} = formModel,
        containsResolved = formModel.values.resolvedValue != null;
    return toolbar(
        recordActionBar({
            actions,
            gridModel,
            record: currentRecord
        }),
        button({
            text: 'Revert',
            icon: Icon.reset(),
            onClick: () => formModel.reset(),
            omit: readonly || !isDirty
        }),
        filler(),
        button({
            text: readonly || (containsResolved && !isDirty) ? 'Close' : 'Cancel',
            onClick: () => model.close()
        }),
        button({
            text: 'Save',
            icon: Icon.check(),
            intent: 'success',
            outlined: true,
            disabled: (!model.isAdd && !isDirty) || !isValid,
            onClick: async () => {
                const {isAdd} = model,
                    {id} = model.currentRecord,
                    reopen = !isAdd && containsResolved && formModel.getField('value')?.isDirty;

                await model.validateAndSaveAsync();
                if (reopen && !model.isOpen) {
                    const record = model.store.getById(id);
                    if (record) {
                        model.parent.editRecord(record);
                        XH.successToast(
                            'The edit has been saved and the resolved value has been updated.'
                        );
                    }
                }
            },
            omit: readonly
        })
    );
});
