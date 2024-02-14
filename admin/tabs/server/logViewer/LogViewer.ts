/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {Icon} from '@xh/hoist/icon';
import {logDisplay} from './LogDisplay';
import './LogViewer.scss';
import {LogViewerModel} from './LogViewerModel';

export const logViewer = hoistCmp.factory({
    model: creates(LogViewerModel),

    render({model}) {
        if (!model.enabled) {
            return errorMessage({error: 'Log viewer disabled via xhEnableLogViewer config.'});
        }

        const {filesGridModel} = model;
        return hframe({
            className: 'xh-log-viewer',
            ref: model.viewRef,
            items: [
                panel({
                    title: 'Available Server Logs',
                    icon: Icon.fileText(),
                    compactHeader: true,
                    modelConfig: {
                        side: 'left',
                        defaultSize: 380
                    },
                    item: grid(),
                    bbar: [
                        storeFilterField({flex: 1}),
                        recordActionBar({
                            selModel: filesGridModel.selModel,
                            gridModel: filesGridModel,
                            actions: [
                                {...model.downloadFileAction, text: null},
                                {...model.deleteFileAction, text: null}
                            ]
                        })
                    ]
                }),
                logDisplay()
            ]
        });
    }
});
