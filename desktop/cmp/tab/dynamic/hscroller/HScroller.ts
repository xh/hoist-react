import composeRefs from '@seznam/compose-react-refs';
import {hbox} from '@xh/hoist/cmp/layout';
import {creates, hoistCmp, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {HScrollerModel} from '@xh/hoist/desktop/cmp/tab/dynamic/hscroller/HScrollerModel';
import {Icon} from '@xh/hoist/icon';
import {useOnResize} from '@xh/hoist/utils/react';
import React, {Ref} from 'react';

/**
 * A horizontal scroller component that displays a content component with left and right scroll
 * buttons when the content overflows the viewport.
 */

export interface HScrollerProps extends HoistProps<HScrollerModel> {
    /** The content to be displayed within the scroller. */
    content: React.FC<{ref: Ref<HTMLDivElement>}>;
}

export const [HScroller, hScroller] = hoistCmp.withFactory<HScrollerProps>({
    displayName: 'HScroller',
    model: creates(HScrollerModel, {publishMode: 'limited'}),
    render({content, model}) {
        const {contentRef} = model;
        return hbox(
            scrollButton({direction: 'left', model}),
            content({
                ref: composeRefs(
                    contentRef,
                    useOnResize(() => model.onViewportEvent())
                )
            }),
            scrollButton({direction: 'right', model})
        );
    }
});

interface ScrollButtonProps extends HoistProps<HScrollerModel> {
    direction: 'left' | 'right';
}

const scrollButton = hoistCmp.factory<ScrollButtonProps>(({direction, model}) => {
    if (!model.showScrollButtons) return null;
    return button({
        icon: direction === 'left' ? Icon.chevronLeft() : Icon.chevronRight(),
        disabled: direction === 'left' ? model.isScrolledToLeft : model.isScrolledToRight,
        onMouseDown: () => model.scroll(direction),
        onMouseUp: () => model.stopScrolling(),
        onMouseLeave: () => model.stopScrolling()
    });
});
