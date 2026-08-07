/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {div, hbox, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {ReactNode} from 'react';
import {groupPathBreadcrumb} from '../GroupPathBreadcrumb';
import {
    GroupPathOption,
    groupValueDisplay,
    NEW_GROUP_VALUE,
    TOP_LEVEL_GROUP_VALUE,
    topLevelLabel
} from '../Utils';
import {GroupFieldModel} from './GroupFieldModel';

interface GroupFieldProps extends HoistProps<GroupFieldModel> {
    /** Text rendered beneath the select, describing what an empty field will do. */
    info?: ReactNode;
}

/**
 * Group select for the view edit panels and the Save As dialog - one searchable combobox over
 * every existing group path, with a persistent option that swaps the control in place into an
 * input naming a new group beneath the current selection.
 */
export const groupField = hoistCmp.factory<GroupFieldProps>({
    model: uses(GroupFieldModel),

    render({model, info}) {
        return model.mode === 'create' ? createFace({model}) : selectFace({model, info});
    }
});

//------------------------
// Implementation
//------------------------
const selectFace = hoistCmp.factory<GroupFieldProps>({
    render({model, info}) {
        const {value, options, placeholder} = model;

        return formField({
            field: 'group',
            label: 'Group',
            className: 'xh-view-manager__group-field',
            info,
            item: select({
                options,
                optionRenderer: (opt: GroupPathOption) => optionDisplay(opt, value),
                valueRenderer: (opt: GroupPathOption) => groupValueDisplay(opt.value, true),
                filterFn: (opt, query) => {
                    model.noteQuery(query);
                    return (
                        opt.value === NEW_GROUP_VALUE ||
                        opt.label.toLowerCase().includes(query.toLowerCase())
                    );
                },
                enableFilter: true,
                enableClear: true,
                placeholder,
                onCommit: (v, prev) => model.onSelectCommit(v, prev)
            }),
            readonlyRenderer: v => groupValueDisplay(v)
        });
    }
});

const createFace = hoistCmp.factory<GroupFieldModel>({
    render({model}) {
        const {parentPath, newNameWarning} = model;

        return formField({
            field: 'newGroupName',
            label: 'Group',
            className: 'xh-view-manager__group-field',
            // The name is written straight to the bound `group` field as it is typed, so its
            // validation must show inline where it blocks the enclosing form's save - not as the
            // hover tooltip that the surrounding forms' `minimal` default would give it.
            minimal: false,
            item: textInput({
                autoFocus: true,
                placeholder: 'New group name',
                // Static context within the field, not an editable segment.
                leftElement: parentPath
                    ? hbox({
                          className: 'xh-view-manager__group-field__parent',
                          items: [
                              groupPathBreadcrumb({path: parentPath, muted: true}),
                              span({
                                  className: 'xh-view-manager__group-path__separator',
                                  item: '›'
                              })
                          ]
                      })
                    : null,
                rightElement: button({
                    icon: Icon.x(),
                    tooltip: 'Cancel - pick an existing group instead',
                    minimal: true,
                    onClick: () => model.cancelCreate()
                }),
                onKeyDown: e => {
                    if (e.key === 'Escape') {
                        // Otherwise taken by the enclosing dialog, closing it outright.
                        e.stopPropagation();
                        model.cancelCreate();
                    }
                }
            }),
            info: div({
                omit: !newNameWarning,
                className: 'xh-view-manager__group-field__warning',
                item: newNameWarning
            })
        });
    }
});

/** Menu display for a group option - breadcrumb, or one of the two non-literal sentinels. */
function optionDisplay(opt: GroupPathOption, selectedValue: string): ReactNode {
    const {value, label} = opt;

    if (value === NEW_GROUP_VALUE) {
        return hbox({
            className: 'xh-view-manager__group-field__create-option',
            alignItems: 'center',
            items: [Icon.add(), span(label)]
        });
    }

    return hbox({
        alignItems: 'center',
        items: [
            // Mirrors the left gutter of Select's own default option renderer - custom renderers
            // are not otherwise told which option is selected.
            div({
                style: {minWidth: 25, textAlign: 'center'},
                item: value === selectedValue ? Icon.check({size: 'sm'}) : null
            }),
            value === TOP_LEVEL_GROUP_VALUE ? topLevelLabel() : groupPathBreadcrumb({path: value})
        ]
    });
}
