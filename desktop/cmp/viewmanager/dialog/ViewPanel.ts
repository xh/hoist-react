/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {div, filler, hbox, hspacer, span, vbox, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, switchInput, textArea, textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {ViewPanelModel} from '@xh/hoist/desktop/cmp/viewmanager/dialog/ViewPanelModel';
import {getGroupOptions} from '@xh/hoist/desktop/cmp/viewmanager/dialog/Utils';
import {fmtDateTime} from '@xh/hoist/format';
import {Icon} from '@xh/hoist/icon';
import {capitalize} from 'lodash';

/**
 * Form to edit or view details on a single saved view within the ViewManager manage dialog.
 */
export const viewPanel = hoistCmp.factory({
    model: uses(ViewPanelModel),
    render({model}) {
        const {view} = model;
        if (!view) return null;

        const {isGlobal, lastUpdated, lastUpdatedBy, isEditable} = view;

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
                                options: getGroupOptions(
                                    model.parent.viewManagerModel,
                                    view.isOwned ? 'owned' : 'global'
                                )
                            }),
                            readonlyRenderer: v =>
                                v || span({item: 'None provided', className: 'xh-text-color-muted'})
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
                            field: 'isShared',
                            label: 'Shared?',
                            inline: true,
                            item: switchInput(),
                            readonlyRenderer: v => (v ? 'Yes' : 'No'),
                            omit: isGlobal
                        }),
                        formField({
                            field: 'isDefaultPinned',
                            label: 'Pin by default?',
                            labelWidth: 110,
                            inline: true,
                            item: switchInput(),
                            omit: !isGlobal || !isEditable
                        }),
                        vspacer(),
                        formButtons(),
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

const formButtons = hoistCmp.factory<ViewPanelModel>({
    render({model}) {
        const {formModel, parent, view} = model,
            {readonly} = formModel,
            {isPinned} = view;

        return formModel.isDirty
            ? hbox({
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
                          onClick: () => formModel.reset()
                      })
                  ]
              })
            : vbox({
                  style: {gap: 10, alignItems: 'center'},
                  items: [
                      button({
                          text: isPinned ? 'Unpin from your Menu' : 'Pin to your Menu',
                          icon: Icon.pin({
                              prefix: isPinned ? 'fas' : 'far',
                              className: isPinned ? 'xh-yellow' : null
                          }),
                          width: 200,
                          outlined: true,
                          onClick: () => parent.togglePinned([view])
                      }),
                      button({
                          text: `Promote to ${capitalize(parent.globalDisplayName)} ${parent.typeDisplayName}`,
                          icon: Icon.globe(),
                          width: 200,
                          outlined: true,
                          omit: readonly || view.isGlobal || !parent.manageGlobal,
                          onClick: () => parent.makeGlobalAsync(view)
                      }),
                      button({
                          text: 'Delete',
                          icon: Icon.delete(),
                          width: 200,
                          outlined: true,
                          intent: 'danger',
                          omit: readonly,
                          onClick: () => parent.deleteAsync([view])
                      })
                  ]
              });
    }
});
