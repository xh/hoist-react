/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {useRef} from 'react';
import {elem, hoistCmp, uses, ModelPublishMode} from '@xh/hoist/core';
import {useOwnedModelLinker, ModelLookup, modelLookupContextProvider} from '@xh/hoist/core/impl';
import {refreshContextView} from '@xh/hoist/core/refresh';
import {frame} from '@xh/hoist/cmp/layout';
import {RenderMode} from '@xh/hoist/enums';

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

    render({model, className}) {
        const {
                content,
                contentModel,
                isActive,
                renderMode,
                refreshContextModel,
                modelLookupContext
            } = model,
            wasActivated = useRef(false);

        // If content model provided, pass it in via context
        const lookupContext = contentModel ?
            new ModelLookup(contentModel, modelLookupContext, ModelPublishMode.DEFAULT) :
            modelLookupContext;

        // Respect RenderMode
        if (!wasActivated.current && isActive) {
            wasActivated.current = true;
        }

        if (
            !isActive &&
            (
                (renderMode == RenderMode.UNMOUNT_ON_HIDE) ||
                (renderMode == RenderMode.LAZY && !wasActivated.current)
            )
        ) {
            return null;
        }

        const contentElem = content.isHoistComponent ? elem(content, {flex: 1}) : content();

        return modelLookupContextProvider({
            value: lookupContext,
            item: frame({
                className,
                item: refreshContextView({
                    model: refreshContextModel,
                    item: ownedModelWrapper({
                        contentModel,
                        contentElem
                    })
                })
            })
        });
    }
});

// This util component wraps the allows the content to own the content model, if one
// was provided via a contentModelFn.
const ownedModelWrapper = hoistCmp.factory({
    render({contentModel, contentElem}) {
        useOwnedModelLinker(contentModel ? contentModel : null);
        return contentElem;
    }
});
