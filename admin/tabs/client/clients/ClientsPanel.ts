/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {ClientsModel} from './ClientsModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {box, filler, fragment, p} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {exportButton, colChooserButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {select} from '@xh/hoist/desktop/cmp/input';

export const clientsPanel = hoistCmp.factory<ClientsModel>({
    model: creates(ClientsModel),

    render({model}) {
        if (!XH.webSocketService.enabled) return notPresentMessage();

        return panel({
            tbar: [
                select({
                    bind: 'groupBy',
                    placeholder: 'Group by...',
                    options: [
                        {value: 'user', label: 'By User'},
                        {value: 'instance', label: 'By Server'}
                    ],
                    enableClear: true
                }),
                storeFilterField(),
                toolbarSep(),
                gridCountLabel({unit: 'client'}),
                toolbarSep(),
                relativeTimestamp({bind: 'lastRefresh'}),
                filler(),
                recordActionBar({
                    selModel: model.gridModel.selModel,
                    actions: [model.forceSuspendAction, model.reqHealthReportAction]
                }),
                toolbarSep(),
                colChooserButton(),
                exportButton()
            ],
            item: grid(),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});

const notPresentMessage = hoistCmp.factory(() =>
    box({
        height: 200,
        width: 1000,
        items: [
            errorMessage({
                error: {
                    message: fragment(
                        p('WebSockets are not enabled in this application.'),
                        p(
                            'Please ensure that you have enabled web sockets in your server and client application configuration.'
                        )
                    )
                }
            })
        ]
    })
);
