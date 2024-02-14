/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {ServerEnvModel} from '@xh/hoist/admin/tabs/server/environment/ServerEnvModel';
import {grid, gridCountLabel} from '@xh/hoist/cmp/grid';
import {filler, span} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {creates, hoistCmp} from '@xh/hoist/core';
import {exportButton} from '@xh/hoist/desktop/cmp/button';
import {errorMessage} from '@xh/hoist/desktop/cmp/error';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {Icon} from '@xh/hoist/icon';

export const serverEnvPanel = hoistCmp.factory({
    model: creates(ServerEnvModel),

    render({model}) {
        const {lastLoadException} = model;

        return panel({
            tbar: [
                Icon.info(),
                span({
                    item: 'Server-side environment variables and JVM system properties',
                    className: 'xh-bold'
                }),
                filler(),
                gridCountLabel({unit: 'entries'}),
                '-',
                storeFilterField({matchMode: 'any'}),
                exportButton()
            ],
            item: lastLoadException ? errorMessage({error: lastLoadException}) : grid(),
            mask: 'onLoad'
        });
    }
});
