/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {ServerEnvModel} from '@xh/hoist/admin/tabs/cluster/instances/environment/ServerEnvModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';

export const serverEnvPanel = hoistCmp.factory({
    model: creates(ServerEnvModel),

    render({model}) {
        const {lastLoadException} = model;

        return panel({
            bbar: [
                filler(),
                gridCountLabel({unit: 'entries'}),
                '-',
                storeFilterField({matchMode: 'any'}),
                exportButton()
            ],
            item: lastLoadException ? errorMessage({error: lastLoadException}) : grid(),
            mask: 'onLoad',
            ref: model.viewRef
        });
    }
});
