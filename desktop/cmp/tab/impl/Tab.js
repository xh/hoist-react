/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {useRef} from 'react';
import {hoistCmp, uses, ModelPublishMode, RenderMode} from '@xh/hoist/core';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {frame} from '@xh/hoist/cmp/layout';
import {TabModel} from '@xh/hoist/cmp/tab';
import {elementFromContent} from '@xh/hoist/utils/react';

/**
 * Wrapper for contents to be shown within a TabContainer. This Component is used by TabContainer's
 * internal implementation to:
 *
 *   - Mount/unmount its contents according to {@see TabModel.renderMode}.
 *   - Track and trigger refreshes according to {@see TabModel.refreshMode}.
 *   - Stretch its contents using a flex layout.
 *
 * @private
 */
export const tab = hoistCmp.factory({
    displayName: 'Tab',
    className: 'xh-tab',
    model: uses(TabModel, {publishMode: ModelPublishMode.LIMITED}),

    render({model, className}) {
        let {content, isActive, renderMode, refreshContextModel} = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        if (
            !isActive &&
            (
                (renderMode == RenderMode.UNMOUNT_ON_HIDE) ||
                (renderMode == RenderMode.LAZY && !wasActivated.current)
            )
        ) {
            return null;
        }

        return frame({
            display: isActive ? 'flex' : 'none',
            className,
            item: refreshContextView({
                model: refreshContextModel,
                item: elementFromContent(content, {flex: 1})
            })
        });
    }
});
