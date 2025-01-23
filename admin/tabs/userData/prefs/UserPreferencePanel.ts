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
import {jsonSearchPanel} from '@xh/hoist/admin/jsonsearch/JsonSearchPanel';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';

export const userPreferencePanel = hoistCmp.factory({
    model: creates(UserPreferenceModel),

    render({model}) {
        return hframe(
            panel({
                items: [
                    restGrid({
                        extraToolbarItems: () => {
                            return button({
                                icon: Icon.gear(),
                                text: 'Configure',
                                onClick: () => (model.showEditorDialog = true)
                            });
                        }
                    }),
                    prefEditorDialog()
                ],
                mask: 'onLoad'
            }),
            jsonSearchPanel({
                docSearchUrl: 'preferenceJsonSearchAdmin/searchByJsonPath',
                matchingNodesUrl: 'preferenceJsonSearchAdmin/getMatchingNodes',
                gridModelConfig: {
                    sortBy: ['name'],
                    groupBy: 'groupName',
                    columns: [
                        {
                            field: {name: 'type', type: 'string'},
                            width: 200
                        },
                        {
                            field: {name: 'owner', type: 'string'},
                            width: 200
                        },
                        {...Col.lastUpdated},
                        {
                            field: {name: 'json', type: 'string'},
                            hidden: true
                        },
                        {...AdminCol.name},
                        {...AdminCol.groupName}
                    ]
                }
            })
        );
    }
});
