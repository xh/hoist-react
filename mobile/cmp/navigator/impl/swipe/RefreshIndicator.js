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
            top = -40 + (refreshProgress * 60),
            degrees = Math.floor(refreshProgress * 360),
            className = classNames(
                'xh-navigator__indicator',
                refreshCompleted ? 'xh-navigator__indicator--complete' : null,
                refreshStarted ? 'xh-navigator__indicator--started' : null
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