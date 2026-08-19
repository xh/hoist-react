/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {DiagnosticsModel} from '@xh/hoist/inspector/instances/DiagnosticsModel';
import {InspectorModel} from '@xh/hoist/inspector/InspectorModel';
import {isEmpty} from 'lodash';

/**
 * Live readout of the data-pipeline `diagnostics` published by selected Stores, Cube Views, and
 * GridModels. See {@link DiagnosticsModel}.
 *
 * @internal
 */
export const diagnosticsPanel = hoistCmp.factory({
    displayName: 'DiagnosticsPanel',
    model: uses(DiagnosticsModel, {fromContext: false, publishMode: 'none'}),

    render({model}) {
        // Re-parent grid popups (context/column menus) when Inspector is popped out.
        const popupParent = useContextModel(InspectorModel)?.windowContainer ?? undefined,
            hasTracked = !isEmpty(model.trackedDiagnostics);

        return panel({
            title: 'Diagnostics',
            icon: Icon.gauge(),
            compactHeader: true,
            modelConfig: {
                side: 'bottom',
                defaultSize: 250,
                persistWith: {...model.parent.persistWith, path: 'diagnosticsPanel'},
                showHeaderCollapseButton: true,
                xhImpl: true
            },
            item: grid({model: model.gridModel, agOptions: {popupParent}}),
            bbar: toolbar({
                items: [
                    span({
                        title: 'Stream each op performed by the selected instances to the devtools console, without raising the app-wide log level.',
                        item: switchInput({
                            bind: 'logOps',
                            label: 'Log ops',
                            disabled: !hasTracked
                        })
                    }),
                    filler(),
                    button({
                        icon: Icon.reset(),
                        tooltip: 'Reset op counts and timings for the selected instances',
                        disabled: !hasTracked,
                        onClick: () => model.resetAll()
                    })
                ]
            })
        });
    }
});
