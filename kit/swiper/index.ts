/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {elementFactory} from '@xh/hoist/core';
import {Swiper, SwiperSlide} from 'swiper/react';
import {EffectCreative} from 'swiper/modules';
import './styles.scss';

export {Swiper, SwiperSlide, EffectCreative};
export const swiper = elementFactory(Swiper),
    swiperSlide = elementFactory(SwiperSlide);
