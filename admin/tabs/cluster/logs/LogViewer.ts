/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {logLevelDialog} from '@xh/hoist/admin/tabs/cluster/logs/levels/LogLevelDialog';
import {grid} from '@xh/hoist/cmp/grid';
import {hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {logDisplay} from './LogDisplay';
import './LogViewer.scss';
import {LogViewerModel} from './LogViewerModel';

export const logViewer = hoistCmp.factory({
    model: creates(LogViewerModel),
    displayName: 'LogViewer',
    className: 'xh-log-viewer',

    render({model, className}) {
        if (!model.enabled) {
            return errorMessage({error: 'Log viewer disabled via xhEnableLogViewer config.'});
        }

        return hframe({
            className,
            ref: model.viewRef,
            items: [
                panel({
                    collapsedTitle: 'Log Files',
                    collapsedIcon: Icon.fileText(),
                    modelConfig: {
                        side: 'left',
                        defaultSize: 380
                    },
                    item: grid(),
                    bbar: [
                        storeFilterField({flex: 1}),
                        select({
                            bind: 'instanceOnly',
                            width: 90,
                            enableFilter: false,
                            hideDropdownIndicator: true,
                            hideSelectedOptionCheck: true,
                            options: [
                                {label: model.instanceName, value: true},
                                {label: 'ALL', value: false}
                            ]
                        })
                    ],
                    mask: 'onLoad'
                }),
                logDisplay(),
                model.showLogLevelDialog ? logLevelDialog() : null
            ]
        });
    }
});
