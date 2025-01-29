/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import * as Col from '@xh/hoist/admin/columns/Rest';
import * as AdminCol from '@xh/hoist/admin/columns';
import {prefEditorDialog} from '@xh/hoist/admin/tabs/userData/prefs/editor/PrefEditorDialog';
import {UserPreferenceModel} from '@xh/hoist/admin/tabs/userData/prefs/UserPreferenceModel';
import {hframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {jsonSearchButton} from '@xh/hoist/admin/jsonsearch/JsonSearchPanel';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';

export const userPreferencePanel = hoistCmp.factory({
    model: creates(UserPreferenceModel),

    render({model}) {
        return hframe(
            panel({
                items: [
                    restGrid({
                        extraToolbarItems: () => [
                            button({
                                icon: Icon.gear(),
                                text: 'Configure',
                                onClick: () => (model.showEditorDialog = true)
                            }),
                            toolbarSep(),
                            jsonSearchButton({
                                subjectName: 'User Preference',
                                docSearchUrl: 'jsonSearch/searchUserPreferences',
                                matchingNodesUrl: 'jsonSearch/getMatchingNodes',
                                gridModelConfig: {
                                    sortBy: ['groupName', 'name', 'owner'],
                                    columns: [
                                        {
                                            field: {name: 'owner', type: 'string'},
                                            width: 200
                                        },
                                        {...AdminCol.groupName},
                                        {...AdminCol.name},
                                        {
                                            field: {name: 'json', type: 'string'},
                                            hidden: true
                                        },
                                        {...Col.lastUpdated}
                                    ]
                                },
                                groupByOptions: ['owner', 'groupName', 'name']
                            })
                        ]
                    }),
                    prefEditorDialog()
                ],
                mask: 'onLoad'
            })
        );
    }
});
