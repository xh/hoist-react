/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {AppModel} from '@xh/hoist/admin/AppModel';
import {HzObjectModel} from './HzObjectModel';

export const hzObjectPanel = hoistCmp.factory({
    model: creates(HzObjectModel),

    render({model}) {
        const {readonly} = AppModel,
            {selModel} = model.gridModel;

        return panel({
            mask: 'onLoad',
            tbar: [
                span({
                    item: 'Distributed Objects',
                    className: 'xh-bold'
                }),
                filler(),
                gridCountLabel({unit: 'objects'}),
                '-',
                storeFilterField({matchMode: 'any'}),
                exportButton()
            ],
            item: grid()
        });
    }
});
