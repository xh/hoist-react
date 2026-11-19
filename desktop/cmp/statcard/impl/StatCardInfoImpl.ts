/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {tooltip as tooltipCmp} from '@xh/hoist/cmp/popover';
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import type {ReactElement} from 'react';

interface StatCardInfoImplProps extends HoistProps {
    icon: ReactElement;
    content: ReactElement | string;
}

/**
 * Desktop implementation of a StatCard's info icon and its tooltip.
 * @internal
 */
export const statCardInfoImpl = hoistCmp.factory<StatCardInfoImplProps>({
    model: false,

    render({icon, content}) {
        return tooltipCmp({className: 'xh-stat-card__info', children: icon, content});
    }
});
