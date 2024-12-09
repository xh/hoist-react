/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {div, filler, hbox, hspacer, span, vframe} from '@xh/hoist/cmp/layout';

import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {EditFormModel} from '@xh/hoist/desktop/cmp/viewmanager/dialog/EditFormModel';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {checkbox, select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {getGroupOptions} from '@xh/hoist/desktop/cmp/viewmanager/dialog/Utils';
import {fmtDateTime} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {startCase} from 'lodash';

/**
 * Default Edit Form for ViewManager
 */
export const editForm = hoistCmp.factory({
    model: uses(EditFormModel),
    render({model}) {
        const {formModel, view, parent} = model;
        if (!view) return null;

        const {viewManagerModel} = parent,
            {globalDisplayName} = viewManagerModel,
            {lastUpdated, lastUpdatedBy} = view;

        return panel({
            item: form({
                fieldDefaults: {
                    commitOnChange: true,
                    inline: true,
                    minimal: true
                },
                item: vframe({
                    className: 'xh-view-manager__manage-dialog__form',
                    items: [
                        formField({
                            field: 'name',
                            item: textInput()
                        }),
                        formField({
                            field: 'group',
                            item: select({
                                enableCreate: true,
                                enableClear: true,
                                placeholder: 'Select optional group....',
                                options: getGroupOptions(
                                    model.parent.viewManagerModel,
                                    view.isOwned ? 'owned' : 'global'
                                )
                            })
                        }),
                        formField({
                            field: 'description',
                            item: textArea({
                                selectOnFocus: true,
                                height: 70
                            }),
                            readonlyRenderer: v =>
                                v
                                    ? v
                                    : span({
                                          item: 'None provided',
                                          className: 'xh-text-color-muted'
                                      })
                        }),
                        formField({
                            field: 'isShared',
                            label: 'Shared?',
                            item: checkbox(),
                            omit: formModel.values.isGlobal
                        }),
                        formField({
                            field: 'isDefaultPinned',
                            label: 'Default Pin?',
                            item: checkbox(),
                            omit: !formModel.values.isGlobal
                        }),
                        formField({
                            field: 'isGlobal',
                            label: 'Ownership',
                            item: select({
                                options: [
                                    {value: false, label: 'Owned by you'},
                                    {value: true, label: startCase(globalDisplayName)}
                                ],
                                enableFilter: false
                            })
                        }),
                        hbox({
                            omit: !model.showSaveButton,
                            items: [
                                filler(),
                                button({
                                    text: 'Save Changes',
                                    icon: Icon.check(),
                                    intent: 'success',
                                    minimal: false,
                                    disabled: !formModel.isValid,
                                    flex: 1,
                                    onClick: () => model.saveAsync()
                                }),
                                hspacer(),
                                button({
                                    icon: Icon.reset(),
                                    tooltip: 'Revert changes',
                                    minimal: false,
                                    onClick: () => formModel.reset()
                                }),
                                filler()
                            ]
                        }),
                        filler(),
                        div({
                            className: 'xh-view-manager__manage-dialog__metadata',
                            item: `Last Updated: ${fmtDateTime(lastUpdated)} by ${lastUpdatedBy === XH.getUsername() ? 'you' : lastUpdatedBy}`
                        })
                    ]
                })
            }),
            bbar: bbar()
        });
    }
});

const bbar = hoistCmp.factory<EditFormModel>({
    render({model}) {
        const {parent} = model;
        return toolbar(
            button({
                text: 'Delete',
                icon: Icon.delete(),
                intent: 'danger',
                disabled: !parent.canDelete,
                onClick: () => parent.deleteAsync([model.view])
            }),
            filler(),
            button({text: 'Close', onClick: () => parent.close()})
        );
    }
});
