/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';

import './Dragger.scss';
import {DraggerModel} from './DraggerModel';

export const dragger = hoistCmp.factory({
    displayName: 'Dragger',
    model: creates(DraggerModel),
    render({model}) {
        return div({
            ref: model.ref,
            className: `xh-resizable-dragger ${model.panelModel.side}`,
            draggable: true
        });
    }
});
