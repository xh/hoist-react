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
 * Indicator for the swipeToGoBack affordance
 * @internal
 */
export const backIndicator = hoistCmp.factory<SwiperModel>(({model}) => {
    const {backStarted, backProgress, backCompleted} = model,
        left = -40 + backProgress * 60,
        className = classNames(
            'xh-swiper-indicator',
            backCompleted ? 'xh-swiper-indicator--complete' : null,
            backStarted ? 'xh-swiper-indicator--started' : null
        );
    return div({
        className,
        style: {
            top: '50%',
            left,
            transform: `translateY(-50%)`
        },
        item: Icon.chevronLeft()
    });
});
