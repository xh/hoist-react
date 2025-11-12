/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {frame} from '@xh/hoist/cmp/layout';
import {TabContainerProps, TabModel} from '@xh/hoist/cmp/tab';
import {
    hoistCmp,
    HoistProps,
    PlainObject,
    refreshContextView,
    TestSupportProps,
    uses
} from '@xh/hoist/core';
import {elementFromContent} from '@xh/hoist/utils/react';
import {isFunction} from 'lodash';
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
interface TabProps extends HoistProps<TabModel>, TestSupportProps {
    childTabContainerProps?: TabContainerProps['childTabContainerProps'];
}

export const tab = hoistCmp.factory<TabProps>({
    displayName: 'Tab',
    className: 'xh-tab',
    model: uses(TabModel, {publishMode: 'limited'}),

    render({model, childTabContainerProps, className, testId}) {
        const {childContainerModel, content, isActive, id, renderMode, refreshContextModel} = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        if (
            !isActive &&
            (renderMode === 'unmountOnHide' || (renderMode === 'lazy' && !wasActivated.current))
        ) {
            return null;
        }

        let contentProps: PlainObject = {flex: 1};
        if (childContainerModel) {
            if (isFunction(childTabContainerProps)) {
                contentProps = {
                    ...contentProps,
                    ...childTabContainerProps({tabId: id, depth: childContainerModel.depth})
                };
            } else if (childTabContainerProps) {
                contentProps = {...contentProps, ...childTabContainerProps};
            }
        }

        return frame({
            display: isActive ? 'flex' : 'none',
            className,
            testId,
            item: refreshContextView({
                model: refreshContextModel,
                item: errorBoundary(elementFromContent(content, contentProps))
            })
        });
    }
});
