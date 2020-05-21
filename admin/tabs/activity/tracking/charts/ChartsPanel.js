/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {isEmpty} from 'lodash';
import {uses, hoistCmp} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {switchInput} from '@xh/hoist/desktop/cmp/input';
import {ChartsModel} from './ChartsModel';

export const chartsPanel = hoistCmp.factory({
    model: uses(ChartsModel),
    render({model}) {
        if (isEmpty(model.dimensions)) return null;
        return panel({
            item: tabContainer(),
            bbar: bbar(),
            model: {
                defaultSize: 500,
                side: 'bottom',
                prefName: 'xhAdminActivityChartSize'
            }
        });
    }
});

const bbar = hoistCmp.factory(
    () => toolbar(
        switchInput({
            label: 'All Logs',
            bind: 'chartAllLogs'
        })
    )
);
