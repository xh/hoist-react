/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {grid} from '@xh/hoist/cmp/grid';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabSwitcher} from '@xh/hoist/desktop/cmp/tab';
import {div, hframe, placeholder} from '@xh/hoist/cmp/layout';
import {ServerTabModel} from './ServerTabModel';

export const serverTab = hoistCmp.factory({
    model: creates(ServerTabModel),
    render({model}) {
        const {instance} = model;
        return hframe(
            panel({
                width: 160,
                item: div(
                    grid({height: 100}),
                    tabSwitcher({
                        height: 1000,
                        omit: !instance,
                        orientation: 'left'
                    })
                )
            }),
            instance
                ? tabContainer({flex: 1})
                : placeholder('Please choose an instance at the right')
        );
    }
});
