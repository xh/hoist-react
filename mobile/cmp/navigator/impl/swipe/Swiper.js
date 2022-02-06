import {hoistCmp, creates} from '@xh/hoist/core';
import {frame} from '@xh/hoist/cmp/layout';
import {gestureDetector} from '@xh/hoist/kit/onsen';


import './Swiper.scss';
import {refreshIndicator} from './RefreshIndicator';
import {backIndicator} from './BackIndicator';
import {SwiperModel} from './SwiperModel';

/**
 * Wrap the Onsen Navigator with drag gesture handling.
 *
 * @private
 */
export const swiper = hoistCmp.factory({
    model: creates(SwiperModel),

    render({model, children}) {
        return frame(
            refreshIndicator(),
            backIndicator(),
            gestureDetector({
                onDragStart: model.onDragStart,
                onDrag: model.onDrag,
                onDragEnd: model.onDragEnd,
                item: children
            })
        );
    }
});