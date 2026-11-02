/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {errorBoundary} from '@xh/hoist/cmp/error/ErrorBoundary';
import {div} from '@xh/hoist/cmp/layout';
import {TabModel} from '@xh/hoist/cmp/tab';
import {hoistCmp, refreshContextView, uses} from '@xh/hoist/core';
import '@xh/hoist/mobile/register';
import {TEST_ID} from '@xh/hoist/utils/js';
import {elementFromContent} from '@xh/hoist/utils/react';
import {useRef} from 'react';
import './Tabs.scss';

/**
 * Wrapper for contents to be shown within a mobile TabContainer. Renders the tab's content, as a
 * page that fills its wrapper and scrolls, or nothing when the tab's `renderMode` says an
 * inactive tab should not be rendered.
 *
 * @internal
 */
export const tab = hoistCmp.factory({
    displayName: 'Tab',
    className: 'xh-tab-page',
    model: uses(TabModel, {publishMode: 'limited'}),

    render({model, className, testId}) {
        const {content, isActive, renderMode, refreshContextModel} = model,
            wasActivated = useRef(false);

        if (!wasActivated.current && isActive) wasActivated.current = true;

        if (
            !isActive &&
            (renderMode === 'unmountOnHide' || (renderMode === 'lazy' && !wasActivated.current))
        ) {
            return null;
        }

        return refreshContextView({
            model: refreshContextModel,
            item: div({
                [TEST_ID]: testId,
                className,
                item: errorBoundary(elementFromContent(content))
            })
        });
    }
});
