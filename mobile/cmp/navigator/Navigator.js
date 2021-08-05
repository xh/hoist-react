/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {frame, div} from '@xh/hoist/cmp/layout';
import {gestureDetector, navigator as onsenNavigator} from '@xh/hoist/kit/onsen';
import {Icon} from '@xh/hoist/icon';
import PT from 'prop-types';
import classNames from 'classnames';
import './Navigator.scss';
import {NavigatorModel} from './NavigatorModel';

/**
 * Top-level Component within an application, responsible for rendering a stack of
 * pages and managing transitions between pages.
 */
export const [Navigator, navigator] = hoistCmp.withFactory({
    displayName: 'Navigator',
    model: uses(NavigatorModel),
    className: 'xh-navigator',

    render({model, className, animation = 'slide'}) {
        return frame({
            className,
            items: [
                swipeIndicator(),
                gestureDetector({
                    onDragStart: model.onDragStart,
                    onDrag: model.onDrag,
                    onDragEnd: model.onDragEnd,
                    item: onsenNavigator({
                        initialRoute: {init: true},
                        animation,
                        animationOptions: {duration: 0.2, delay: 0, timing: 'ease-in'},
                        renderPage: model.renderPage,
                        onPostPush: model.onPageChange,
                        onPostPop: model.onPageChange
                    })
                })
            ]
        });
    }
});

Navigator.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(NavigatorModel), PT.object]),

    /** Set animation style or turn off, default 'slide' */
    animation: PT.oneOf(['slide', 'lift', 'fade', 'none'])
};

const swipeIndicator = hoistCmp.factory(
    ({model}) => {
        const {swipeProgress, swipeStarted, swipeComplete} = model,
            left = -40 + (swipeProgress * 60),
            className = classNames(
                'xh-navigator__swipe-indicator',
                swipeStarted ? 'xh-navigator__swipe-indicator--started' : null,
                swipeComplete ? 'xh-navigator__swipe-indicator--complete' : null
            );

        return div({
            className,
            style: {left},
            item: Icon.chevronLeft()
        });
    }
);
