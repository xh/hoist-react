/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {hoistCmp, refreshContextView, uses} from '@xh/hoist/core';
import {page as onsenPage} from '@xh/hoist/kit/onsen';
import {elementFromContent} from '@xh/hoist/utils/react';
import {useRef} from 'react';
import {PageModel} from '../PageModel';
import './Page.scss';
import {errorBoundary} from '@xh/hoist/cmp/error/ErrorBoundary';

/**
 * Wrapper for contents to be shown within a Navigator. This Component is used by Navigator's
 * internal implementation to:
 *
 *  - Mount/unmount its contents according to `PageModel.renderMode`.
 *  - Track and trigger refreshes according to `PageModel.refreshMode`.
 *
 * @internal
 */
export const page = hoistCmp.factory({
    displayName: 'Page',
    model: uses(PageModel, {publishMode: 'limited'}),

    render({model}) {
        const {content, props, isActive, renderMode, refreshContextModel} = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        if (
            !isActive &&
            (renderMode === 'unmountOnHide' || (renderMode === 'lazy' && !wasActivated.current))
        ) {
            // Note: We must render an empty placeholder page to work with the Navigator.
            return onsenPage({className: 'xh-page'});
        }

        return refreshContextView({
            model: refreshContextModel,
            item: onsenPage({
                className: 'xh-page',
                item: errorBoundary(elementFromContent(content, props))
            })
        });
    }
});
