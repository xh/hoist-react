/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import * as AdminCol from '@xh/hoist/admin/columns';
import * as Col from '@xh/hoist/admin/columns/Rest';
import {jsonSearchButton} from '@xh/hoist/admin/jsonsearch/JsonSearch';
import {fragment} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
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
