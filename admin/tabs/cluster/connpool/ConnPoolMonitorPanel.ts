/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {ConnPoolMonitorModel} from '@xh/hoist/admin/tabs/cluster/connpool/ConnPoolMonitorModel';
import {chart} from '@xh/hoist/cmp/chart';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, span, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';

export const connPoolMonitorPanel = hoistCmp.factory({
    model: creates(ConnPoolMonitorModel),

    render({model}) {
        if (!model.supported) {
            return errorMessage({
                error: `Connection pool monitoring requires Hoist Core >= ${model.minHoistCoreVersion}.`
            });
        }

        if (!model.enabled) {
            return errorMessage({
                error: 'Connection pool monitoring disabled via xhConnPoolMonitoringConfig, or no suitable DataSource detected.'
            });
        }

        const {readonly} = AppModel;
        return panel({
            tbar: [
                span({
                    item: 'JDBC Connection Pool',
                    className: 'xh-bold'
                }),
                filler(),
                gridCountLabel({unit: 'snapshot'}),
                '-',
                button({
                    text: 'Take Snapshot',
                    icon: Icon.camera(),
                    omit: readonly,
                    onClick: () => model.takeSnapshotAsync()
                }),
                button({
                    text: 'Reset Stats',
                    icon: Icon.reset(),
                    omit: readonly,
                    onClick: () => model.resetStatsAsync()
                }),
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
            title: 'Pool Configuration',
            icon: Icon.info(),
            compactHeader: true,
            modelConfig: {
                side: 'right',
                defaultSize: 450,
                defaultCollapsed: true
            },
            item: jsonInput({
                readonly: true,
                height: '100%',
                width: '100%',
                enableSearch: true,
                showFullscreenButton: false,
                editorProps: {lineNumbers: false},
                value: JSON.stringify(model.poolConfiguration, null, 2)
            })
        });
    }
});