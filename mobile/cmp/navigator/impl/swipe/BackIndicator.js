import {Icon} from '@xh/hoist/icon';
import classNames from 'classnames';
import {hoistCmp} from '@xh/hoist/core';
import {div} from '@xh/hoist/cmp/layout';

/**
 * Indicator for the swipeToGoBack affordance
 * @private
 */
export const backIndicator = hoistCmp.factory(
    ({model}) => {
        const {backStarted, backProgress, backCompleted}  = model,
            left = -40 + (backProgress * 60),
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
    }
);