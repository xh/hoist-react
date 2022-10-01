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

    /** @param {StatsModel} model */
    render({model}) {
        const {panelModel} = model,
            {collapsed} = panelModel;
        return panel({
            title: collapsed ? 'Stats' : null,
            icon: collapsed ? Icon.chartArea() : null,
            compactHeader: true,
            model: model.panelModel,
            items: [
                grid(),
                panel({
                    item: chart(),
                    model: {
                        side: 'bottom',
                        defaultSize: 200,
                        xhImpl: true
                    }
                })
            ],
            bbar: toolbar({
                compact: true,
                items: [
                    button({
                        tooltip: 'Reset stats',
                        icon: Icon.reset(),
                        onClick: () => XH.inspectorService.clearStats()
                    }),
                    button({
                        tooltip: 'Take stat snapshot now',
                        icon: Icon.camera(),
                        onClick: () => XH.inspectorService.updateStats()
                    }),
                    filler(),
                    popover({
                        target: span(Icon.info(), ' JS Heap'),
                        interactionKind: 'hover',
                        content: div({
                            className: 'xh-pad',
                            item: span('Note that JS heap space is as reported by the ', code('window.performance.memory'), ' API.')
                        })
                    })
                ]
            })
        });
    }
});
