/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {errorMessage} from '@xh/hoist/cmp/error';
import {frame} from '@xh/hoist/cmp/layout';
import {tabContainer, TabModel} from '@xh/hoist/cmp/tab';
import {hoistCmp, refreshContextView, uses} from '@xh/hoist/core';
import {elementFromContent} from '@xh/hoist/utils/react';
import {useRef} from 'react';
import {errorBoundary} from '@xh/hoist/cmp/error/ErrorBoundary';

/**
 * Wrapper for contents to be shown within a TabContainer. This Component is used by TabContainer's
 * internal implementation to:
 *
 *   - Mount/unmount its contents according to {@link TabModel.renderMode}.
 *   - Track and trigger refreshes according to {@link TabModel.refreshMode}.
 *   - Stretch its contents using a flex layout.
 *
 * @internal
 */
export const tab = hoistCmp.factory({
    displayName: 'Tab',
    className: 'xh-tab',
    model: uses(TabModel, {publishMode: 'limited'}),

    render({model, className, testId}) {
        let {
                content,
                subTabContainer,
                subTabContainerClass,
                isActive,
                renderMode,
                refreshContextModel,
                id
            } = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        if (
            !isActive &&
            (renderMode === 'unmountOnHide' || (renderMode === 'lazy' && !wasActivated.current))
        ) {
            return null;
        }

        if (content && subTabContainer) {
            content = errorMessage({
                error:
                    `Invalid tab configuration for id '${id}':` +
                    "A tab cannot define both 'content' and 'subTabContainer'. " +
                    'Please move the content into a child tab or remove the subTabContainer.'
            });
        } else if (subTabContainer) {
            content = tabContainer({className: subTabContainerClass, model: subTabContainer});
        }

        return frame({
            display: isActive ? 'flex' : 'none',
            className,
            testId,
            item: refreshContextView({
                model: refreshContextModel,
                item: errorBoundary(elementFromContent(content, {flex: 1}))
            })
        });
    }
});
