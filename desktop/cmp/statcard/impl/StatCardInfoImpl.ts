/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {HoistProps} from '@xh/hoist/core';
import {hoistCmp} from '@xh/hoist/core';
import {tooltip as bpTooltip} from '@xh/hoist/kit/blueprint';
import type {ReactElement} from 'react';

interface StatCardInfoImplProps extends HoistProps {
    icon: ReactElement;
    content: ReactElement | string;
}

/**
 * Desktop implementation of a StatCard's info icon, showing its tooltip in a Blueprint tooltip.
 * @internal
 */
export const statCardInfoImpl = hoistCmp.factory<StatCardInfoImplProps>({
    model: false,

    render({icon, content}) {
        return bpTooltip({className: 'xh-stat-card__info', item: icon, content});
    }
});
