import composeRefs from '@seznam/compose-react-refs';
import {hbox, vbox} from '@xh/hoist/cmp/layout';
import {BoxProps, creates, hoistCmp, HoistProps} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {ScrollerModel} from '@xh/hoist/desktop/cmp/tab/dynamic/scroller/ScrollerModel';
import {Icon} from '@xh/hoist/icon';
import {useOnResize} from '@xh/hoist/utils/react';
import React, {Ref} from 'react';

/**
 * A scroller component that displays a content component with directional scroll buttons when the
 * content overflows the viewport.
 * @internal
 */

export interface HScrollerProps extends HoistProps<ScrollerModel>, Omit<BoxProps, 'content'> {
    /** The content to be displayed within the scroller. */
    content: React.FC<{ref: Ref<HTMLDivElement>}>;
    /** Props to be passed to the content component. */
    contentProps?: Record<string, any>;
    /** Orientation of the scroller - horizontal (default) or vertical. */
    orientation?: 'horizontal' | 'vertical';
}

export const [Scroller, scroller] = hoistCmp.withFactory<HScrollerProps>({
    displayName: 'Scroller',
    model: creates(ScrollerModel, {publishMode: 'limited'}),
    render({className, content, contentProps, model, orientation, ...layoutProps}) {
        const {contentRef, isHorizontal} = model,
            container = isHorizontal ? hbox : vbox;
        return container({
            ...layoutProps,
            className,
            items: [
                scrollButton({direction: 'backward', model}),
                content({
                    ...contentProps,
                    ref: composeRefs(
                        contentRef,
                        useOnResize(() => model.onViewportEvent())
                    )
                }),
                scrollButton({direction: 'forward', model})
            ]
        });
    }
});

interface ScrollButtonProps extends HoistProps<ScrollerModel> {
    direction: 'forward' | 'backward';
}

const scrollButton = hoistCmp.factory<ScrollButtonProps>(({direction, model}) => {
    if (!model.showScrollButtons) return null;
    return button({
        icon:
            direction === 'backward'
                ? model.isHorizontal
                    ? Icon.chevronLeft()
                    : Icon.chevronUp()
                : model.isHorizontal
                  ? Icon.chevronRight()
                  : Icon.chevronDown(),
        disabled: direction === 'backward' ? model.isScrolledToStart : model.isScrolledToEnd,
        onMouseDown: () => model.scroll(direction),
        onMouseUp: () => model.stopScrolling(),
        onMouseLeave: () => model.stopScrolling()
    });
});
