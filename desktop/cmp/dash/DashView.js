/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {useRef} from 'react';
import {elem, hoistCmp, uses, ModelPublishMode} from '@xh/hoist/core';
import {modelLookupContextProvider} from '@xh/hoist/core/impl';
import {useOnMount} from '@xh/hoist/utils/react';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {frame} from '@xh/hoist/cmp/layout';
import {DashRenderMode} from '@xh/hoist/enums';

import {DashViewModel} from './DashViewModel';

/**
 * Wrapper for contents to be shown within a DashContainer. This Component is used by DashContainer's
 * internal implementation to:
 *
 *   - Mount/unmount its contents according to `DashViewSpec.renderMode`.
 *   - Track and trigger refreshes according to `DashViewSpec.refreshMode`.
 *   - Stretch its contents using a flex layout.
 *
 * @private
 */
export const dashView = hoistCmp.factory({
    displayName: 'DashView',
    className: 'xh-dash-view',
    model: uses(DashViewModel, {publishMode: ModelPublishMode.LIMITED}),

    render({model, className, glEventHub}) {
        const {viewSpec, isActive, renderMode, refreshContextModel} = model,
            {content} = viewSpec,
            wasActivated = useRef(false);

        // Wire up Golden Layouts EventHub
        useOnMount(() => model.setEventHub(glEventHub));

        // Respect DashRenderMode
        if (!wasActivated.current && isActive) {
            wasActivated.current = true;
        }

        if (
            !isActive &&
            (
                (renderMode == DashRenderMode.UNMOUNT_ON_HIDE) ||
                (renderMode == DashRenderMode.LAZY && !wasActivated.current)
            )
        ) {
            return null;
        }

        const contentElem = content.isHoistComponent ? elem(content, {flex: 1}) : content();

        return modelLookupContextProvider({
            value: model.containerModel.modelLookupContext,
            item: frame({
                className,
                item: refreshContextView({
                    model: refreshContextModel,
                    item: contentElem
                })
            })
        });
    }
});
