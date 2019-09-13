/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {hoistCmp, creates} from '@xh/hoist/core';
import {fragment} from '@xh/hoist/cmp/layout';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';

import {ConfigModel} from './ConfigModel';
import {configDiffer} from './differ/ConfigDiffer';

export const ConfigPanel = hoistCmp({
    model: creates(ConfigModel),

    render({model}) {
        return fragment(
            restGrid({
                extraToolbarItems: () => {
                    return button({
                        icon: Icon.diff(),
                        text: 'Compare w/ Remote',
                        onClick: () => model.differModel.open()
                    });
                }
            }),
            configDiffer()
        );
    }
});
