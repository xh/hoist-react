/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {chart} from '@xh/hoist/cmp/chart';
import {grid} from '@xh/hoist/cmp/grid';
import {code, div, filler, span} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {StatsModel} from '@xh/hoist/inspector/stats/StatsModel';
import {popover} from '@xh/hoist/kit/blueprint';

export const statsPanel = hoistCmp.factory({
    model: creates(StatsModel),

    render({model}) {
        return panel({
            title: 'Stats',
            icon: Icon.chartArea(),
            compactHeader: true,
            model: model.panelModel,
            items: [
                grid(),
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
                        tooltip: 'Reset stats',
                        icon: Icon.reset(),
                        onClick: () => XH.inspectorService.clearStats()
                    }),
                    button({
                        tooltip: 'Take stat snapshot now',
                        icon: Icon.camera(),
                        onClick: () => XH.inspectorService.updateStats()
                    })
                ]
            })
        });
    }
});
