/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {grid} from '@xh/hoist/cmp/grid';
import {code, div, filler, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, useContextModel, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {InspectorModel} from '@xh/hoist/inspector/InspectorModel';
import {StatsModel} from '@xh/hoist/inspector/stats/StatsModel';
import {popover} from '@xh/hoist/kit/blueprint';

export const statsPanel = hoistCmp.factory({
    model: creates(StatsModel),

    render({model}) {
        const inspectorModel = useContextModel(InspectorModel),
            popupParent = inspectorModel?.windowContainer ?? undefined;

        return panel({
            title: 'Stats',
            icon: Icon.chartArea(),
            compactHeader: true,
            model: model.panelModel,
            items: [
                grid({agOptions: {popupParent}}),
                panel({
                    item: chart(),
                    modelConfig: {
                        side: 'bottom',
                        defaultSize: 200,
                        xhImpl: true
                    }
                })
            ],
            bbar: toolbar({
                items: [
                    popover({
                        item: span('JS Heap ', Icon.info()),
                        interactionKind: 'hover',
                        content: div({
                            className: 'xh-pad',
                            item: span(
                                'Note that JS heap space is as reported by the ',
                                code('window.performance.memory'),
                                ' API.'
                            )
                        })
                    }),
                    filler(),
                    button({
                        text: `Tab ${XH.tabId}`,
                        icon: Icon.window(),
                        tooltip: 'Focus the app tab this Inspector is attached to',
                        onClick: () => inspectorModel.focusApp()
                    }),
                    '-',
                    button({
                        tooltip: 'Take stat snapshot now',
                        icon: Icon.camera(),
                        onClick: () => XH.inspectorService.updateStats()
                    }),
                    button({
                        tooltip: 'Clear stats',
                        icon: Icon.trash(),
                        onClick: () => XH.inspectorService.clearStats()
                    }),
                    '-',
                    button({
                        tooltip: "Restore Inspector's layout and options to their defaults",
                        icon: Icon.reset(),
                        onClick: () => {
                            // Confirm dialog renders in the app window - bring it forward.
                            inspectorModel.focusApp();
                            XH.inspectorService.restoreDefaultsAsync();
                        }
                    })
                ]
            })
        });
    }
});
