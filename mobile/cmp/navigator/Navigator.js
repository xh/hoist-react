/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {navigator as onsenNavigator} from '@xh/hoist/kit/onsen';
import PT from 'prop-types';
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
        return onsenNavigator({
            className,
            initialRoute: {init: true},
            animation,
            animationOptions: {duration: 0.2, delay: 0, timing: 'ease-in'},
            renderPage: (pageModel, navigator) => model.renderPage(pageModel, navigator),
            onPostPush: () => model.onPageChange(),
            onPostPop: () => model.onPageChange()
        });
    }
});

Navigator.propTypes = {
    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(NavigatorModel), PT.object]),

    /** Set animation style or turn off, default 'slide' */
    animation: PT.oneOf(['slide', 'lift', 'fade', 'none'])
};
