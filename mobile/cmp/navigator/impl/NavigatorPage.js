/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {useRef} from 'react';
import {hoistCmp, uses, ModelPublishMode, RenderMode} from '@xh/hoist/core';
import {page} from '@xh/hoist/mobile/cmp/page';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {elementFromContent} from '@xh/hoist/utils/react';

import {NavigatorPageModel} from '../NavigatorPageModel';

/**
 * Wrapper for contents to be shown within a Navigator. This Component is used by Navigator's
 * internal implementation to:
 *
 *      - Mount/unmount its contents according to `NavigatorPageModel.renderMode`.
 *      - Track and trigger refreshes according to `NavigatorPageModel.refreshMode`.
 *
 * @private
 */
export const navigatorPage = hoistCmp.factory({
    displayName: 'NavigatorPage',
    model: uses(NavigatorPageModel, {publishMode: ModelPublishMode.LIMITED}),

    render({model}) {
        const {content, props, isActive, renderMode, refreshContextModel} = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        if (
            !isActive &&
            (
                (renderMode === RenderMode.UNMOUNT_ON_HIDE) ||
                (renderMode === RenderMode.LAZY && !wasActivated.current)
            )
        ) {
            // Note: We must render an empty placeholder page to work with the Navigator.
            return page();
        }

        return refreshContextView({
            model: refreshContextModel,
            item: elementFromContent(content, props)
        });
    }
});