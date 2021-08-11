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
                'xh-navigator__indicator',
                backCompleted ? 'xh-navigator__indicator--complete' : null,
                backStarted ? 'xh-navigator__indicator--started' : null
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