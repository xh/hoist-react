/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {LogLevelDialogModel} from '@xh/hoist/admin/tabs/cluster/instances/logs/levels/LogLevelDialogModel';
import {filler, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';

export const logLevelDialog = hoistCmp.factory({
    model: creates(LogLevelDialogModel),
    render({model}) {
        const {parent} = model;
        return dialog({
            title: 'Configure Log Levels',
            icon: Icon.gear(),
            className: 'xh-admin-app__editor-dialog',
            isOpen: parent.showLogLevelDialog,
            canOutsideClickClose: false,
            onClose: () => (parent.showLogLevelDialog = false),
            item: panel({
                item: restGrid(),
                bbar: [
                    Icon.infoCircle(),
                    span('Note - log level adjustments apply to all instances in the cluster'),
                    filler(),
                    button({
                        text: 'Close',
                        icon: Icon.close(),
                        onClick: () => (parent.showLogLevelDialog = false)
                    })
                ]
            })
        });
    }
});
