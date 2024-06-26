/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {mask} from '@xh/hoist/desktop/cmp/mask';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import {box, hspacer, placeholder, vframe} from '@xh/hoist/cmp/layout';
import {ClusterTabModel} from './ClusterTabModel';
import {Icon} from '@xh/hoist/icon';

export const clusterTab = hoistCmp.factory({
    model: creates(ClusterTabModel),
    render({model}) {
        const {instance} = model;
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
            instance?.isReady
                ? panel({
                      compactHeader: true,
                      tbar: [
                          box({width: 150, item: model.formatInstance(instance)}),
                          hspacer(25),
                          tabSwitcher()
                      ],
                      flex: 1,
                      item: tabContainer()
                  })
                : placeholder(Icon.server(), 'Select a running instance above.'),
            mask({bind: model.loadModel})
        );
    }
});
