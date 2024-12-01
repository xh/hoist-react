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
import {select, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {fmtCompactDate} from '@xh/hoist/format';
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

        const {manageGlobal, globalDisplayName} = parent,
            {lastUpdated, lastUpdatedBy, owner} = view,
            isOwnView = owner === XH.getUsername();

        return panel({
            item: form({
                fieldDefaults: {
                    commitOnChange: true
                },
                item: vframe({
                    className: 'xh-view-manager__manage-dialog__form',
                    items: [
                        formField({
                            field: 'name',
                            item: textInput()
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
                            field: 'isGlobal',
                            label: 'Visibility',
                            item: select({
                                options: [
                                    {value: true, label: startCase(globalDisplayName)},
                                    {
                                        value: false,
                                        label: `Private to ${isOwnView ? 'me' : owner}`
                                    }
                                ],
                                enableFilter: false
                            }),
                            omit: !manageGlobal
                        }),
                        hbox({
                            omit: !model.showSaveButton,
                            style: {margin: '10px 20px'},
                            items: [
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
                                })
                            ]
                        }),
                        filler(),
                        div({
                            className: 'xh-view-manager__manage-dialog__metadata',
                            item: `Last Updated: ${fmtCompactDate(lastUpdated)} (${lastUpdatedBy === XH.getUsername() ? 'you' : lastUpdatedBy})`
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
