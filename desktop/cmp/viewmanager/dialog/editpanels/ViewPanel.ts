/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {br, div, filler, fragment, span, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {VIEW_GROUP_DELIMITER} from '@xh/hoist/cmp/viewmanager';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {ViewPanelModel} from '@xh/hoist/desktop/cmp/viewmanager/dialog/editpanels/ViewPanelModel';
import {
    getGroupPathOptions,
    getVisibilityInfo,
    getVisibilityOptions,
    groupPathDisplay,
    groupPathOptionRenderer,
    parseGroupSelectValue
} from '@xh/hoist/desktop/cmp/viewmanager/dialog/Utils';
import {fmtDateTime} from '@xh/hoist/format';
import {formButtons} from './FormButtons';

/**
 * Form to edit or view details on a single saved view within the ViewManager manage dialog.
 */
export const viewPanel = hoistCmp.factory({
    model: uses(ViewPanelModel),
    render({model}) {
        const {view, parent, formModel} = model,
            {viewManagerModel} = parent;

        if (!view) return null;

        const {lastUpdated, lastUpdatedBy, isEditable} = view,
            visibility = formModel.values.visibility,
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
                        formField({
                            field: 'name',
                            item: textInput({enableClear: true})
                        }),
                        formField({
                            field: 'owner',
                            omit: isEditable
                        }),
                        formField({
                            field: 'group',
                            item: select({
                                options: getGroupPathOptions(viewManagerModel, isGlobal, {
                                    includeRoot: true
                                }),
                                optionRenderer: groupPathOptionRenderer(formModel.values.group),
                                enableCreate: true,
                                createMessageFn: v =>
                                    `Create group "${parseGroupSelectValue(v) ?? v}"`,
                                enableFilter: true,
                                enableClear: true,
                                placeholder: 'Select or enter a group...'
                            }),
                            readonlyRenderer: v => groupPathDisplay(v),
                            info: isEditable
                                ? fragment(
                                      `Move this ${viewManagerModel.typeDisplayName} into the chosen group.`,
                                      br(),
                                      `Type to create a new group - use "${VIEW_GROUP_DELIMITER}" to nest.`
                                  )
                                : null
                        }),
                        formField({
                            field: 'description',
                            item: textArea({
                                selectOnFocus: true,
                                height: 70
                            }),
                            readonlyRenderer: v =>
                                v || span({item: 'None provided', className: 'xh-text-color-muted'})
                        }),
                        formField({
                            field: 'visibility',
                            omit: !isEditable || visOptions.length === 1,
                            item: select({options: visOptions, enableFilter: false}),
                            info: visInfo
                        }),
                        vspacer(),
                        formButtons({model}),
                        filler(),
                        div({
                            className: 'xh-view-manager__manage-dialog__metadata',
                            item: `Last Updated: ${fmtDateTime(lastUpdated)} by ${lastUpdatedBy === XH.getUsername() ? 'you' : lastUpdatedBy}`
                        })
                    ]
                })
            })
        });
    }
});
