/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {ConnPoolMonitorModel} from '@xh/hoist/admin/tabs/server/connectionpool/ConnPoolMonitorModel';
import {chart} from '@xh/hoist/cmp/chart';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';

export const connPoolMonitorPanel = hoistCmp.factory({
    model: creates(ConnPoolMonitorModel),

    render({model}) {
        if (!model.enabled) {
            return errorMessage({
                error: 'Connection pool monitoring disabled via xhConnPoolMonitoringConfig, or no suitable DataSource detected.'
            });
        }

        if (model.lastLoadException) {
            return errorMessage({
                title: 'Error loading connection pool snapshots.',
                error: model.lastLoadException,
                actionFn: () => model.refreshAsync()
            });
        }

        const {readonly} = AppModel;
        return panel({
            tbar: [
                button({
                    text: 'Take Snapshot',
                    icon: Icon.camera(),
                    omit: readonly,
                    onClick: () => model.takeSnapshotAsync()
                }),
                '-',
                button({
                    text: 'Reset Stats',
                    icon: Icon.reset(),
                    intent: 'danger',
                    omit: readonly,
                    onClick: () => model.resetStatsAsync()
                }),
                filler(),
                gridCountLabel({unit: 'snapshot'}),
                '-',
                exportButton()
            ],
            items: hframe(
                vframe(
                    grid(),
                    panel({
                        modelConfig: {
                            side: 'bottom',
                            defaultSize: 400
                        },
                        item: chart()
                    })
                ),
                poolConfigPanel()
            ),
            mask: 'onLoad'
        });
    }
});

const poolConfigPanel = hoistCmp.factory<ConnPoolMonitorModel>({
    render({model}) {
        return panel({
            title: 'Connection Pool Configuration',
            icon: Icon.gears(),
            compactHeader: true,
            modelConfig: {
                defaultSize: 500,
                defaultCollapsed: true,
                side: 'right'
            },
            item: jsonInput({
                value: JSON.stringify(model.poolConfiguration, null, 2),
                readonly: true,
                height: '100%',
                width: '100%',
                enableSearch: true
            })
        });
    }
});
