/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {dialog} from '@xh/hoist/kit/blueprint';
import {ZoneMapperModel} from '@xh/hoist/cmp/zoneGrid/impl/ZoneMapperModel';
import {zoneMapper} from './ZoneMapper';

export const zoneMapperDialog = hoistCmp.factory({
    model: uses(ZoneMapperModel),
    className: 'xh-zone-mapper-dialog',

    render({model, className}) {
        const {isOpen} = model;
        if (!isOpen) return null;

        return dialog({
            className,
            icon: Icon.gridLarge(),
            title: 'Customize Fields',
            isOpen: true,
            onClose: () => model.close(),
            item: zoneMapper({model}),
            // Size determined by inner component
            style: {
                width: 'unset',
                height: 'unset'
            }
        });
    }
});
