/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {FormContext, FormModel} from '@xh/hoist/cmp/form';
import {div, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {VIEW_GROUP_DELIMITER} from '@xh/hoist/cmp/viewmanager';
import {hoistCmp, HoistModel, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {useContext} from 'react';
import {
    GroupPathOption,
    groupPathDisplay,
    groupPathOptionRenderer,
    MIXED_GROUP_VALUE
} from '../Utils';

/** Common surface of the edit panel models backing the shared {@link groupField}. */
export interface GroupFieldPanelModel extends HoistModel {
    /** Must contain 'group' and 'newGroup' fields. */
    formModel: FormModel;
    /** Bindable on the panel models. */
    isAddingNewGroup: boolean;
}

interface GroupFieldProps extends HoistProps<GroupFieldPanelModel> {
    options: GroupPathOption[];
    placeholder?: string;
}

/**
 * Group select for the view edit panels, with a "New Group" button that swaps to a text input
 * naming a single new group to be created under the selected group on save. Replaces free-typed
 * path creation within the select itself.
 */
export const groupField = hoistCmp.factory<GroupFieldProps>({
    render({model, options, placeholder = '[root]'}) {
        const {formModel, isAddingNewGroup} = model,
            {readonly} = formModel,
            group = formModel.values.group,
            isMixed = group === MIXED_GROUP_VALUE,
            // Suppress the newGroup label when the enclosing Form lays fields out inline -
            // a side-by-side label would crowd the row, and the input placeholder suffices.
            fieldDefaults = useContext(FormContext).fieldDefaults,
            inline = fieldDefaults?.inline ?? false,
            // Matches FormField's inline label box - explicit labelWidth, else its 80px minWidth.
            labelWidth = fieldDefaults?.labelWidth ?? 80;

        return vbox({
            className: 'xh-view-manager__group-field',
            items: [
                hbox({
                    // Bottom-align so the buttons track the input row across both stacked-label
                    // and inline formField layouts. Requires minimal (tooltip) validation - an
                    // inline validation message would add a row below the input and misalign.
                    alignItems: 'flex-end',
                    items: [
                        formField({
                            field: 'group',
                            flex: 1,
                            item: select({
                                options,
                                optionRenderer: groupPathOptionRenderer(group),
                                // Display the mixed-groups sentinel - never itself an option.
                                generateOptionFn: v =>
                                    v === MIXED_GROUP_VALUE ? {value: v, label: '[mixed]'} : null,
                                enableFilter: true,
                                enableClear: true,
                                placeholder
                            }),
                            readonlyRenderer: v => groupPathDisplay(v)
                        }),
                        ...(isAddingNewGroup && !readonly
                            ? [
                                  span({
                                      className: 'view-group-delimiter',
                                      item: VIEW_GROUP_DELIMITER
                                  }),
                                  formField({
                                      field: 'newGroup',
                                      label: inline ? null : undefined,
                                      width: 180,
                                      item: textInput({
                                          autoFocus: true,
                                          placeholder: 'New group name...'
                                      })
                                  }),
                                  button({
                                      icon: Icon.x(),
                                      tooltip: 'Cancel new group',
                                      // Offset the formFields' own 3px bottom padding.
                                      marginBottom: 3,
                                      minimal: false,
                                      onClick: () => {
                                          formModel.fields.newGroup.setValue(null);
                                          model.isAddingNewGroup = false;
                                      }
                                  })
                              ]
                            : [
                                  button({
                                      text: 'New Group',
                                      icon: Icon.add(),
                                      omit: readonly,
                                      // A new group needs an unambiguous parent - clear the
                                      // mixed select (to top level) or pick a group first.
                                      disabled: isMixed,
                                      // Offset the formFields' own 3px bottom padding.
                                      marginBottom: 3,
                                      minimal: false,
                                      onClick: () => (model.isAddingNewGroup = true)
                                  })
                              ])
                    ]
                }),
                // Full path of the selected group, spanning the combined fields above - the
                // select's value container shows only the leaf name. Redundant when readonly,
                // where the field itself renders the full path.
                div({
                    omit: readonly || isMixed,
                    className: 'xh-view-manager__group-field__info',
                    // Indent past the inline side-label to align with the select control.
                    style: inline ? {marginLeft: labelWidth} : null,
                    item: groupPathDisplay(group)
                })
            ]
        });
    }
});
