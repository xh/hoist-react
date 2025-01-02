/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {div} from '@xh/hoist/cmp/layout';
import {hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {SwiperModel} from './SwiperModel';

/**
 * Indicator for the pulldownToRefresh affordance
 * @internal
 */
export const refreshIndicator = hoistCmp.factory<SwiperModel>(({model}) => {
    const {refreshStarted, refreshProgress, refreshCompleted} = model,
        top = -40 + refreshProgress * 85,
        degrees = Math.floor(refreshProgress * 360),
        className = classNames(
            'xh-swiper-indicator',
            refreshCompleted ? 'xh-swiper-indicator--complete' : null,
            refreshStarted ? 'xh-swiper-indicator--started' : null
        );

    return div({
        className,
        style: {
            top,
            left: '50%',
            transform: `translateX(-50%) rotate(${degrees}deg)`
        },
        item: Icon.refresh()
    });
});
