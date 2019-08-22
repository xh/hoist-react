/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import {useState} from 'react';
import {elem, elemFactory,  hoistComponent, useProvidedModel} from '@xh/hoist/core';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {getClassName} from '@xh/hoist/utils/react';
import {frame} from '@xh/hoist/cmp/layout';
import {TabRenderMode} from '@xh/hoist/enums';
import {TabModel} from '@xh/hoist/cmp/tab';

/**
 * Wrapper for contents to be shown within a TabContainer. This Component is used by TabContainer's
 * internal implementation to:
 *
 *   - Mount/unmount its contents according to `TabModel.renderMode`.
 *   - Track and trigger refreshes according to `TabModel.refreshMode`.
 *   - Stretch its contents using a flex layout.
 *
 * @private
 */
export const Tab = hoistComponent({
    displayName: 'Tab',

    render(props) {
        let model = useProvidedModel(TabModel, props),
            {content, contentFn, isActive, renderMode, refreshContextModel} = model,
            [flags] = useState({wasActivated: false}),
            className = getClassName('xh-tab', props);

        if (!flags.wasActivated && isActive) flags.wasActivated = true;

        if (
            !isActive &&
            (
                (renderMode == TabRenderMode.UNMOUNT_ON_HIDE) ||
                (renderMode == TabRenderMode.LAZY && !flags.wasActivated)
            )
        ) {
            return null;
        }

        const contentElem = content ? elem(content, {flex: 1}) : contentFn({flex: 1});

        return frame({
            display: isActive ? 'flex' : 'none',
            className,
            item: refreshContextView({
                model: refreshContextModel,
                item: contentElem
            })
        });
    }
});

export const tab = elemFactory(Tab);
