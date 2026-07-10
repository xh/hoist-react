/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {fragment, placeholder, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {pluralize} from '@xh/hoist/utils/js';
import {isEmpty} from 'lodash';
import {getGroupPathOptions, getVisibilityInfo, getVisibilityOptions} from '../Utils';
import {formButtons} from './FormButtons';
import {groupField} from './GroupField';
import {ViewMultiPanelModel} from './ViewMultiPanelModel';

/**
 * Form to bulk-edit group and visibility across multiple selected views within the ViewManager
 * manage dialog, along with bulk pin/unpin and delete actions.
 */
export const viewMultiPanel = hoistCmp.factory({
    model: uses(ViewMultiPanelModel),
    render({model}) {
        const {views, parent, formModel, allEditable} = model,
            {viewManagerModel} = parent;

        if (isEmpty(views)) return null;

        const visibility = formModel.values.visibility,
            isGlobal = visibility === 'global',
            visOptions = getVisibilityOptions(viewManagerModel),
            visInfo = getVisibilityInfo(viewManagerModel, visibility);

        return panel({
            item: form({
                fieldDefaults: {
                    commitOnChange: true,
                    minimal: true
                },
                item: vframe({
                    className: 'xh-view-manager__manage-dialog__form',
                    items: [
                        placeholder(
                            Icon.boxFull(),
                            `Configuring ${views.length} ${pluralize(viewManagerModel.typeDisplayName, views.length)}`
                        ),
                        fragment(
                            groupField({
                                model,
                                omit: !allEditable,
                                options: getGroupPathOptions(viewManagerModel, isGlobal)
                            }),
                            formField({
                                field: 'visibility',
                                omit: !allEditable || visOptions.length === 1,
                                item: select({
                                    options: visOptions,
                                    enableFilter: false,
                                    placeholder: '(Mixed)'
                                }),
                                info: visInfo
                            }),
                            vspacer(),
                            // Group name contextualizes delete/pin wording when the selection
                            // is a sole group row, operating on the group's views as a unit.
                            formButtons({
                                model,
                                groupName: parent.selectedGroupRecord?.data.name
                            })
                        )
                    ]
                })
            })
        });
    }
});
