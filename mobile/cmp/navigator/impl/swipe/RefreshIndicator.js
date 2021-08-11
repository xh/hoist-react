import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {hoistCmp} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';

/**
 * Indicator for the pulldownToRefresh affordance
 * @private
 */
export const refreshIndicator = hoistCmp.factory(
    ({model}) => {
        const {refreshStarted, refreshProgress, refreshCompleted} = model,
            top = -40 + (refreshProgress * 85),
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
    }
);