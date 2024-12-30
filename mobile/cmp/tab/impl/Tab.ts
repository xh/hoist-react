/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {TabModel} from '@xh/hoist/cmp/tab';
import {hoistCmp, refreshContextView, uses} from '@xh/hoist/core';
import {page} from '@xh/hoist/kit/onsen';
import '@xh/hoist/mobile/register';
import {elementFromContent} from '@xh/hoist/utils/react';
import {useRef} from 'react';
import './Tabs.scss';
import {errorBoundary} from '@xh/hoist/cmp/error/ErrorBoundary';

/**
 * @internal
 *
 * Wrapper for contents to be shown within a TabContainer. This Component is used by TabContainer's
 * internal implementation to:
 *
 *   - Mount/unmount its contents according to `TabModel.renderMode`.
 *   - Track and trigger refreshes according to `TabModel.refreshMode`.
 */
export const tab = hoistCmp.factory({
    displayName: 'Tab',
    model: uses(TabModel, {publishMode: 'limited'}),

    render({model}) {
        let {content, isActive, renderMode, refreshContextModel} = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        if (
            !isActive &&
            (renderMode === 'unmountOnHide' || (renderMode === 'lazy' && !wasActivated.current))
        ) {
            // Note: We must render an empty placeholder page to work with Onsen's tabbar.
            return page({className: 'xh-tab-page'});
        }

        return refreshContextView({
            model: refreshContextModel,
            item: page({
                className: 'xh-tab-page',
                item: errorBoundary(elementFromContent(content))
            })
        });
    }
});
