/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {mask} from '@xh/hoist/cmp/mask';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import {box, div, hspacer, p, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {ClusterTabModel} from './ClusterTabModel';
import {Icon} from '@xh/hoist/icon';

export const clusterTab = hoistCmp.factory({
    model: creates(ClusterTabModel),
    render({model}) {
        return vframe(
            panel({
                modelConfig: {
                    side: 'top',
                    defaultSize: 105,
                    minSize: 75,
                    collapsible: false,
                    persistWith: model.persistWith
                },
                item: grid()
            }),
            detailPanel(),
            failedConnectionMask()
        );
    }
});

export const detailPanel = hoistCmp.factory<ClusterTabModel>({
    render({model}) {
        const {instance, lastLoadException} = model;
        if (!instance?.isReady) {
            return placeholder({
                items: [Icon.server(), 'Select a running instance above.'],
                omit: lastLoadException
            });
        }

        return panel({
            compactHeader: true,
            tbar: [
                Icon.server(),
                box({width: 150, item: model.formatInstance(instance)}),
                hspacer(25),
                tabSwitcher()
            ],
            flex: 1,
            item: tabContainer()
        });
    }
});

export const failedConnectionMask = hoistCmp.factory<ClusterTabModel>({
    render({model}) {
        return mask({
            message: div(
                p('Attempting to connect to cluster.'),
                p('Local instance may be unavailable, please wait.')
            ),
            isDisplayed: true,
            spinner: true,
            omit: !model.lastLoadException
        });
    }
});
