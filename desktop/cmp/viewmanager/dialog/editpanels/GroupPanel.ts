/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {form} from '@xh/hoist/cmp/form';
import {fragment, vframe, vspacer} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {formField} from '@xh/hoist/desktop/cmp/form';
import {textInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {formButtons} from './FormButtons';
import {GroupPanelModel} from './GroupPanelModel';

/**
 * Form to edit a single selected group within the ViewManager manage dialog - rename the
 * group itself, and delete actions across all views within it.
 */
export const groupPanel = hoistCmp.factory({
    model: uses(GroupPanelModel),
    render({model}) {
        const {groupRecord, canEditGroup} = model;

        if (!groupRecord) return null;

        return panel({
            item: form({
                fieldDefaults: {
                    commitOnChange: true,
                    minimal: true
                },
                item: vframe({
                    className: 'xh-view-manager__manage-dialog__form',
                    items: [
                        fragment(
                            vspacer(),
                            formField({
                                field: 'name',
                                omit: !canEditGroup,
                                item: textInput({selectOnFocus: true})
                            }),
                            vspacer(),
                            formButtons({model, groupName: groupRecord.data.name})
                        )
                    ]
                })
            })
        });
    }
});
