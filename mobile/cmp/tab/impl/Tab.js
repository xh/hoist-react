/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {useRef} from 'react';
import {hoistCmp, ModelPublishMode, RenderMode, uses} from '@xh/hoist/core';
import {page} from '@xh/hoist/kit/onsen';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {elementFromContent} from '@xh/hoist/utils/react';

import './Tabs.scss';
import {TabModel} from '@xh/hoist/cmp/tab';

/**
 * @private
 *
 * Wrapper for contents to be shown within a TabContainer. This Component is used by TabContainer's
 * internal implementation to:
 *
 *   - Mount/unmount its contents according to `TabModel.renderMode`.
 *   - Track and trigger refreshes according to `TabModel.refreshMode`.
 */
export const tab = hoistCmp.factory({
    displayName: 'Tab',
    model: uses(TabModel, {publishMode: ModelPublishMode.LIMITED}),

    render({model}) {
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
            // Note: We must render an empty placeholder page to work with Onsen's tabbar.
            return page({className: 'xh-tab-page'});
        }

        return refreshContextView({
            model: refreshContextModel,
            item: page({
                className: 'xh-tab-page',
                item: elementFromContent(content)
            })
        });
    }
});