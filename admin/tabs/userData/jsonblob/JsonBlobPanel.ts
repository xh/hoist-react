/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import * as Col from '@xh/hoist/admin/columns/Rest';
import * as AdminCol from '@xh/hoist/admin/columns';
import {hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {jsonSearchPanel} from '@xh/hoist/admin/jsonsearch/JsonSearchPanel';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';
import {differ} from '../../../differ/Differ';
import {JsonBlobModel} from './JsonBlobModel';

export const jsonBlobPanel = hoistCmp.factory({
    model: creates(JsonBlobModel),

    render({model}) {
        return hframe(
            panel({
                item: restGrid({
                    extraToolbarItems: () => {
                        return button({
                            icon: Icon.diff(),
                            text: 'Compare w/ Remote',
                            onClick: () => model.openDiffer()
                        });
                    }
                })
            }),
            jsonSearchPanel({
                docSearchUrl: 'jsonSearch/searchBlobs',
                matchingNodesUrl: 'jsonSearch/getMatchingNodes',
                gridModelConfig: {
                    sortBy: ['owner', 'name'],
                    store: {
                        idSpec: 'token'
                    },
                    columns: [
                        {
                            field: {name: 'token', type: 'string'},
                            hidden: true,
                            width: 100
                        },
                        {
                            field: {name: 'type', type: 'string'},
                            width: 200
                        },
                        {
                            field: {name: 'owner', type: 'string'},
                            width: 200
                        },
                        {...AdminCol.name},
                        {
                            field: {name: 'json', type: 'string'},
                            hidden: true
                        },
                        {...Col.lastUpdated}
                    ]
                },
                groupByOptions: ['owner', 'type', 'name']
            }),
            differ({omit: !model.differModel})
        );
    }
});
