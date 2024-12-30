/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {prefEditorDialog} from '@xh/hoist/admin/tabs/userData/prefs/editor/PrefEditorDialog';
import {UserPreferenceModel} from '@xh/hoist/admin/tabs/userData/prefs/UserPreferenceModel';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';

export const userPreferencePanel = hoistCmp.factory({
    model: creates(UserPreferenceModel),

    render({model}) {
        return panel({
            items: [
                restGrid({
                    extraToolbarItems: () => {
                        return button({
                            icon: Icon.gear(),
                            text: 'Configure',
                            onClick: () => (model.showEditorDialog = true)
                        });
                    }
                }),
                prefEditorDialog()
            ],
            mask: 'onLoad'
        });
    }
});
