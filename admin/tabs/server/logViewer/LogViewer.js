/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {hframe} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';
import {logDisplay} from './LogDisplay';
import './LogViewer.scss';
import {LogViewerModel} from './LogViewerModel';
import {logViewerToolbar} from './LogViewerToolbar';

export const logViewer = hoistCmp.factory({
    model: creates(LogViewerModel),

    render({model}) {
        return hframe({
            className: 'xh-log-viewer',
            ref: model.viewRef,
            items: [
                panel({
                    title: 'Available Server Logs',
                    icon: Icon.fileText(),
                    compactHeader: true,
                    model: {
                        side: 'left',
                        defaultSize: 250
                    },
                    item: grid(),
                    bbar: [
                        storeFilterField({flex: 1})
                    ]
                }),
                panel({
                    tbar: logViewerToolbar(),
                    item: logDisplay(),
                    mask: 'onLoad'
                })
            ]
        });
    }
});
