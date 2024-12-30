/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, HoistProps, uses} from '@xh/hoist/core';
import {navigator as onsenNavigator} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import {swiper} from './impl/swipe/Swiper';
import {NavigatorModel} from './NavigatorModel';

export interface NavigatorProps extends HoistProps<NavigatorModel> {
    /** Set animation style or turn off, default 'slide'. */
    animation?: 'slide' | 'lift' | 'fade' | 'none';
}

/**
 * Top-level Component within an application, responsible for rendering a stack of
 * pages and managing transitions between pages.
 */
export const [Navigator, navigator] = hoistCmp.withFactory<NavigatorProps>({
    displayName: 'Navigator',
    model: uses(NavigatorModel),
    className: 'xh-navigator',

    render({model, className, animation = 'slide'}) {
        return swiper(
            onsenNavigator({
                className,
                initialRoute: {init: true},
                animation,
                animationOptions: {duration: 0.2, delay: 0, timing: 'ease-in'},
                renderPage: model.renderPage,
                onPostPush: model.onPageChange,
                onPostPop: model.onPageChange
            })
        );
    }
});
