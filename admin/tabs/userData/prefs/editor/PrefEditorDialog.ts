/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {UserPreferenceModel} from '@xh/hoist/admin/tabs/userData/prefs/UserPreferenceModel';
import {filler} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, useContextModel} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {differ} from '../../../../differ/Differ';
import {regroupDialog} from '../../../../regroup/RegroupDialog';
import {PrefEditorModel} from './PrefEditorModel';

export const prefEditorDialog = hoistCmp.factory({
    model: creates(PrefEditorModel),

    render({model}) {
        const parentModel = useContextModel(UserPreferenceModel);

        return dialog({
            title: 'Configure Preferences',
            icon: Icon.gear(),
            className: 'xh-admin-app__editor-dialog',
            isOpen: parentModel.showEditorDialog,
            canOutsideClickClose: false,
            onClose: () => (parentModel.showEditorDialog = false),
            item: panel({
                items: [
                    restGrid({
                        extraToolbarItems: () => {
                            return button({
                                icon: Icon.diff(),
                                text: 'Compare w/ Remote',
                                onClick: () => model.openDiffer()
                            });
                        }
                    }),
                    differ({omit: !model.differModel}),
                    regroupDialog()
                ],
                bbar: [
                    filler(),
                    button({
                        text: 'Close',
                        icon: Icon.close(),
                        onClick: () => (parentModel.showEditorDialog = false)
                    })
                ]
            })
        });
    }
});
