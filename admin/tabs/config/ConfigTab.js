/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {fragment} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {restGrid} from '@xh/hoist/desktop/cmp/rest';
import {Icon} from '@xh/hoist/icon';

import {ConfigTabModel} from './ConfigTabModel';
import {regroupDialog} from '../../regroup/RegroupDialog';
import {differ} from '../../differ/Differ';

export const configTab = hoistCmp.factory({
    model: creates(ConfigTabModel),

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
            differ(),
            regroupDialog()
        );
    }
});
