/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {div, hbox, span, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {select, textInput} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {ReactNode} from 'react';
import {groupPathBreadcrumb} from '../GroupPathBreadcrumb';
import {GroupPathOption, groupValueDisplay, TOP_LEVEL_GROUP_VALUE, topLevelLabel} from '../Utils';
import {GroupFieldModel} from './GroupFieldModel';

/**
 * Group select for the view edit panels and the Save As dialog - a dropdown over every existing
 * group path, with an adjacent button to name and select a new group.
 */
export const groupField = hoistCmp.factory<GroupFieldModel>({
    model: uses(GroupFieldModel),

    render({model}) {
        const {value, options, formModel} = model;

        return hbox({
            className: 'xh-view-manager__group-field',
            items: [
                formField({
                    field: 'group',
                    label: 'Group',
                    flex: 1,
                    item: select({
                        options,
                        optionRenderer: (opt: GroupPathOption) => optionDisplay(opt, value),
                        valueRenderer: (opt: GroupPathOption) => groupValueDisplay(opt.value),
                        enableFilter: false,
                        placeholder: 'Top Level'
                    }),
                    readonlyRenderer: v => groupValueDisplay(v)
                }),
                newGroupButton({omit: formModel.readonly})
            ]
        });
    }
});

//------------------------
// Implementation
//------------------------
const newGroupButton = hoistCmp.factory<GroupFieldModel>({
    render({model}) {
        const {isCreateOpen} = model;

        return popover({
            isOpen: isCreateOpen,
            position: 'bottom-right',
            popoverClassName: 'xh-view-manager__new-group-popover',
            // Focus the name input once the overlay has settled - its own `autoFocus` races with
            // the popover transition and lands only intermittently.
            autoFocus: false,
            onOpened: el => el.querySelector('input')?.focus(),
            item: button({
                icon: Icon.add(),
                tooltip: 'Create a new group',
                outlined: true
            }),
            // Unmounted while closed, so the name input reinitializes on each open.
            content: isCreateOpen ? newGroupForm({model}) : span(),
            onInteraction: open => (open ? model.openCreate() : model.closeCreate())
        });
    }
});

const newGroupForm = hoistCmp.factory<GroupFieldModel>({
    render({model}) {
        const {parentPath, composedPath} = model;

        return vbox({
            className: 'xh-view-manager__new-group-popover__form',
            items: [
                textInput({
                    model,
                    bind: 'newGroupName',
                    width: '100%',
                    commitOnChange: true,
                    enableClear: true,
                    placeholder: 'New Group name',
                    onKeyDown: e => {
                        if (e.key === 'Enter') model.closeCreate();
                        if (e.key === 'Escape') {
                            // Otherwise taken by the enclosing dialog, closing it.
                            e.stopPropagation();
                            model.cancelCreate();
                        }
                    }
                }),
                // Where the group will land, growing as the name is typed.
                groupPathBreadcrumb({
                    omit: !parentPath,
                    className: 'xh-view-manager__new-group-popover__path',
                    path: composedPath ?? parentPath
                })
            ]
        });
    }
});

/** Menu display for a group option - a breadcrumb, or the non-literal top-level sentinel. */
function optionDisplay(opt: GroupPathOption, selectedValue: string): ReactNode {
    const {value} = opt;

    return hbox({
        alignItems: 'center',
        items: [
            // Mirrors the left gutter of Select's default option renderer, which custom
            // renderers do not inherit.
            div({
                style: {minWidth: 25, textAlign: 'center'},
                item: value === selectedValue ? Icon.check({size: 'sm'}) : null
            }),
            value === TOP_LEVEL_GROUP_VALUE ? topLevelLabel() : groupPathBreadcrumb({path: value})
        ]
    });
}
