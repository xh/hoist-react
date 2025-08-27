/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {clientDetailPanel} from './activity/ClientDetailPanel';
import {errorMessage} from '@xh/hoist/cmp/error';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, fragment, hframe, p} from '@xh/hoist/cmp/layout';
import {relativeTimestamp} from '@xh/hoist/cmp/relativetimestamp';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {colChooserButton, exportButton} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {recordActionBar} from '@xh/hoist/desktop/cmp/record';
import {ClientsModel} from './ClientsModel';

export const clientsPanel = hoistCmp.factory<ClientsModel>({
    model: creates(ClientsModel),

    render({model}) {
        if (!XH.webSocketService.enabled) return notPresentMessage();

        return panel({
            tbar: [
                select({
                    bind: 'groupBy',
                    placeholder: 'Ungrouped',
                    options: [
                        {value: 'user', label: 'By User'},
                        {value: 'instance', label: 'By Server'}
                    ],
                    enableClear: true,
                    enableFilter: false
                }),
                '-',
                recordActionBar({
                    selModel: model.gridModel.selModel,
                    actions: [model.forceSuspendAction, model.reqHealthReportAction]
                }),
                filler(),
                relativeTimestamp({bind: 'lastRefresh'}),
                '-',
                gridCountLabel({unit: 'client'}),
                '-',
                storeFilterField(),
                colChooserButton(),
                exportButton()
            ],
            items: hframe(grid(), clientDetailPanel()),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});

const notPresentMessage = hoistCmp.factory(() =>
    errorMessage({
        error: {
            message: fragment(
                p('WebSockets are not enabled in this application.'),
                p(
                    'Please ensure that you have enabled WebSockets in your server and client application configuration.'
                )
            )
        }
    })
);
