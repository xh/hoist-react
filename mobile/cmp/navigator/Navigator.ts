/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {hoistCmp, uses} from '@xh/hoist/core';
import {swiper, swiperSlide, EffectCreative} from '@xh/hoist/kit/swiper';
import '@xh/hoist/mobile/register';
import './Navigator.scss';
import {NavigatorModel} from './NavigatorModel';
import {PageModel} from './PageModel';
import {gestureRefresh} from './impl/GestureRefresh';
import {page} from './impl/Page';

/**
 * Top-level Component within an application, responsible for rendering a stack of
 * pages and managing transitions between pages.
 */
export const [Navigator, navigator] = hoistCmp.withFactory<NavigatorModel>({
    displayName: 'Navigator',
    model: uses(NavigatorModel),
    className: 'xh-navigator',
    render({model, className}) {
        const {stack, allowSlideNext, allowSlidePrev} = model;
        return gestureRefresh(
            swiper({
                className,
                allowSlideNext,
                allowSlidePrev,
                slidesPerView: 1,
                modules: [EffectCreative],
                effect: 'creative',
                creativeEffect: {
                    prev: {
                        shadow: true,
                        translate: ['-15%', 0, -1]
                    },
                    next: {
                        translate: ['100%', 0, 0]
                    }
                },
                onSwiper: swiper => model.setSwiper(swiper),
                items: stack.map(it => {
                    const {key} = it as PageModel;
                    return swiperSlide({
                        key: `slide-${key}`,
                        item: page({
                            key: `page-${key}`,
                            model: it
                        })
                    });
                })
            })
        );
    }
});
