/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {div, filler, hbox, hspacer, span, vframe, vspacer} from '@xh/hoist/cmp/layout';

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
import {capitalize} from 'lodash';

/**
 * Default Edit Form for ViewManager
 */
export const editForm = hoistCmp.factory({
    model: uses(EditFormModel),
    render({model}) {
        const {formModel, view} = model;
        if (!view) return null;

        const {isGlobal, lastUpdated, lastUpdatedBy} = view;

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
                                height: 90
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
                            inline: true,
                            item: checkbox(),
                            omit: isGlobal
                        }),
                        formField({
                            field: 'isDefaultPinned',
                            label: 'Default pinned?',
                            inline: true,
                            item: checkbox(),
                            omit: !isGlobal
                        }),
                        vspacer(20),
                        formButtons({omit: formModel.readonly}),
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

const formButtons = hoistCmp.factory<EditFormModel>({
    render({model}) {
        const {formModel, parent, view} = model;
        return formModel.isDirty
            ? hbox(
                  filler(),
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
                      onClick: () => formModel.reset()
                  }),
                  filler()
              )
            : hbox(
                  filler(),
                  button({
                      text: `Make ${capitalize(parent.globalDisplayName)}`,
                      icon: Icon.globe(),
                      omit: !view.isEditable || view.isGlobal || !parent.manageGlobal,
                      onClick: () => parent.makeGlobalAsync(view)
                  }),
                  button({
                      text: 'Delete',
                      icon: Icon.delete(),
                      intent: 'danger',
                      onClick: () => parent.deleteAsync([view])
                  }),
                  filler()
              );
    }
});

const bbar = hoistCmp.factory<EditFormModel>({
    render({model}) {
        const {parent} = model;
        return toolbar(filler(), button({text: 'Close', onClick: () => parent.close()}));
    }
});
