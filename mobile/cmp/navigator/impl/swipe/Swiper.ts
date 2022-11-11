import {frame} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp} from '@xh/hoist/core';
import {gestureDetector} from '@xh/hoist/kit/onsen';
import {backIndicator} from './BackIndicator';
import {refreshIndicator} from './RefreshIndicator';


import './Swiper.scss';
import {SwiperModel} from './SwiperModel';

/**
 * Wrap the Onsen Navigator with drag gesture handling.
 *
 * @internal
 */
export const swiper = hoistCmp.containerFactory({
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