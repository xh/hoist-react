/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {div, frame} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {gestureDetector} from '@xh/hoist/kit/onsen';
import classNames from 'classnames';
import './GestureRefresh.scss';
import {GestureRefreshModel} from './GestureRefreshModel';

/**
 * Wrap the Navigator with gesture that triggers a refresh by pulling down.
 *
 * @internal
 */
export const gestureRefresh = hoistCmp.factory({
    model: creates(GestureRefreshModel),
    render({model, children}) {
        return frame(
            refreshIndicator(),
            gestureDetector({
                className: 'xh-gesture-refresh',
                onDragStart: model.onDragStart,
                onDrag: model.onDrag,
                onDragEnd: model.onDragEnd,
                item: children
            })
        );
    }
});

const refreshIndicator = hoistCmp.factory<GestureRefreshModel>(({model}) => {
    const {refreshStarted, refreshProgress, refreshCompleted} = model,
        top = -40 + refreshProgress * 85,
        degrees = Math.floor(refreshProgress * 360),
        className = classNames(
            'xh-gesture-refresh-indicator',
            refreshCompleted ? 'xh-gesture-refresh-indicator--complete' : null,
            refreshStarted ? 'xh-gesture-refresh-indicator--started' : null
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
