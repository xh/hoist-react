/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {filler, placeholder, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, useContextModel, uses} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {DiagnosticsModel} from '@xh/hoist/inspector/instances/details/DiagnosticsModel';
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
    model: uses(DiagnosticsModel, {fromContext: false}),

    render({model}) {
        // Parent grid popups (context/column menus) into the Inspector window.
        const popupParent = useContextModel(InspectorModel).windowContainer,
            hasTracked = !isEmpty(model.trackedDiagnostics);

        return panel({
            item: hasTracked
                ? grid({model: model.gridModel, agOptions: {popupParent}})
                : placeholder(
                      Icon.gauge(),
                      'Select a Store, Cube, Cube View, or GridModel to view data-pipeline diagnostics.'
                  ),
            bbar: toolbar({
                omit: !hasTracked,
                items: [
                    span({
                        title: 'Stream each op performed by the selected instances to the devtools console, without raising the app-wide log level. Sticky per instance - logging continues when the selection moves elsewhere.',
                        item: switchInput({
                            value: model.logOps,
                            onChange: v => model.setLogOps(v),
                            label: 'Log operations to console'
                        })
                    }),
                    filler(),
                    button({
                        icon: Icon.reset(),
                        tooltip: 'Reset op counts and timings for the selected instances',
                        onClick: () => model.resetAll()
                    })
                ]
            })
        });
    }
});
