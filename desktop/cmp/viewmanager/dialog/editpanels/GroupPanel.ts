/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {fragment, hbox, hspacer, placeholder, vbox, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {every, isEmpty} from 'lodash';
import {
    getGroupPathOptions,
    getVisibilityInfo,
    getVisibilityOptions,
    groupPathOptionRenderer
} from '../Utils';
import {GroupPanelModel} from './GroupPanelModel';

/**
 * Form to edit a single selected group within the ViewManager manage dialog - rename/re-nest the
 * group itself, plus bulk visibility, pin/unpin, and delete actions across all views within it.
 */
export const groupPanel = hoistCmp.factory({
    model: uses(GroupPanelModel),
    render({model}) {
        const {groupRecord, parent, formModel, allEditable, canEditGroup, group, isGlobal} = model,
            {viewManagerModel} = parent;

        if (!groupRecord) return null;

        const visibility = formModel.values.visibility,
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
                            Icon.folderOpen(),
                            `Configuring group "${groupRecord.data.name}"`
                        ),
                        fragment(
                            vspacer(),
                            formField({
                                field: 'name',
                                omit: !canEditGroup,
                                item: textInput({selectOnFocus: true})
                            }),
                            formField({
                                field: 'nestUnder',
                                omit: !canEditGroup,
                                item: select({
                                    options: getGroupPathOptions(viewManagerModel, isGlobal, {
                                        includeRoot: true,
                                        excludeSubtreeOf: group
                                    }),
                                    optionRenderer: groupPathOptionRenderer(
                                        formModel.values.nestUnder
                                    ),
                                    enableFilter: true
                                })
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
                            formButtons()
                        )
                    ]
                })
            })
        });
    }
});

const formButtons = hoistCmp.factory<GroupPanelModel>({
    render({model}) {
        const {formModel, parent, views, allEditable} = model,
            allPinned = every(views, 'isPinned');

        if (formModel.isDirty) {
            return hbox({
                justifyContent: 'center',
                items: [
                    button({
                        text: 'Save Changes',
                        icon: Icon.check(),
                        intent: 'success',
                        minimal: false,
                        disabled: !formModel.isValid,
                        onClick: () => model.saveAsync()
                    }),
                    hspacer(),
                    button({
                        icon: Icon.reset(),
                        tooltip: 'Revert changes',
                        minimal: false,
                        onClick: () => model.reset()
                    })
                ]
            });
        }

        if (isEmpty(views)) return null;

        return vbox({
            style: {gap: 10, alignItems: 'center'},
            items: [
                button({
                    text: allPinned ? 'Unpin from your Menu' : 'Pin to your Menu',
                    icon: Icon.pin({
                        prefix: allPinned ? 'fas' : 'far',
                        className: allPinned ? 'xh-yellow' : ''
                    }),
                    width: 200,
                    outlined: true,
                    onClick: () => parent.togglePinned(views)
                }),
                button({
                    text: 'Delete',
                    icon: Icon.delete(),
                    width: 200,
                    outlined: true,
                    intent: 'danger',
                    omit: !allEditable,
                    onClick: () => parent.deleteAsync(views)
                })
            ]
        });
    }
});
