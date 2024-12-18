/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {AppModel} from '@xh/hoist/admin/AppModel';
import {ConnPoolMonitorModel} from '@xh/hoist/admin/tabs/cluster/instances/connpool/ConnPoolMonitorModel';
import {chart} from '@xh/hoist/cmp/chart';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, hframe, vframe} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button, exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {jsonInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';

export const connPoolMonitorPanel = hoistCmp.factory({
    model: creates(ConnPoolMonitorModel),

    render({model}) {
        if (!model.enabled) {
            return errorMessage({
                error: 'Connection pool monitoring disabled via xhConnPoolMonitoringConfig, or no suitable DataSource detected.'
            });
        }

        return panel({
            item: hframe(
                vframe(
                    grid(),
                    panel({
                        modelConfig: {
                            side: 'bottom',
                            defaultSize: '50%'
                        },
                        item: chart()
                    })
                ),
                poolConfigPanel()
            ),
            bbar: bbar(),
            ref: model.viewRef,
            mask: 'onLoad'
        });
    }
});

const bbar = hoistCmp.factory<ConnPoolMonitorModel>({
    render({model}) {
        const {readonly} = AppModel;
        return toolbar(
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
                omit: readonly,
                onClick: () => model.resetStatsAsync()
            }),
            filler(),
            gridCountLabel({unit: 'snapshot'}),
            '-',
            exportButton()
        );
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
