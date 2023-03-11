/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {frame} from '@xh/hoist/cmp/layout';
import {hoistCmp, refreshContextView, uses} from '@xh/hoist/core';
import {elementFromContent} from '@xh/hoist/utils/react';
import {useRef} from 'react';
import {DashViewModel} from '../../DashViewModel';

/**
 * Implementation component to show an item within a DashContainer.  This component
 * is used by DashContainer's internal implementation to:
 *
 *   - Mount/unmount its contents according to `DashViewSpec.renderMode`.
 *   - Track and trigger refreshes according to `DashViewSpec.refreshMode`.
 *   - Stretch its contents using a flex layout.
 *
 * @internal
 */
export const dashContainerView = hoistCmp.factory({
    displayName: 'DashContainerView',
    className: 'xh-dash-tab',
    model: uses(DashViewModel, {publishMode: 'limited'}),

    render({model, className}) {
        const {isActive, renderMode, refreshContextModel, viewSpec} = model,
            wasActivated = useRef(false);

        // Respect RenderMode
        if (!wasActivated.current && isActive) {
            wasActivated.current = true;
        }

        if (
            !isActive &&
            (renderMode === 'unmountOnHide' || (renderMode === 'lazy' && !wasActivated.current))
        ) {
            return null;
        }
        return frame({
            className,
            item: refreshContextView({
                model: refreshContextModel,
                item: elementFromContent(viewSpec.content, {flex: 1})
            })
        });
    }
});
