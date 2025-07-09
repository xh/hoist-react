/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {frame} from '@xh/hoist/cmp/layout';
import {TabModel, tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp, refreshContextView, uses} from '@xh/hoist/core';
import {elementFromContent} from '@xh/hoist/utils/react';
import {isEmpty} from 'lodash';
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
        let {content, isActive, renderMode, refreshContextModel, switcher, children} = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        if (
            !isActive &&
            (renderMode === 'unmountOnHide' || (renderMode === 'lazy' && !wasActivated.current))
        ) {
            return null;
        }

        if (!isEmpty(children)) {
            return errorBoundary(
                tabContainer({
                    className,
                    modelConfig: {
                        route: `${model.containerModel.route}.${model.id}`,
                        switcher,
                        tabs: children
                    }
                })
            );
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
