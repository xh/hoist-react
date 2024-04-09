/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {box, fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Children, ReactPortal} from 'react';
import {createPortal} from 'react-dom';
import {PrintSupportModel} from './PrintSupportModel';

import './PrintSupport.scss';

/**
 * A PrintSupport container provides the ability for its child component to be printed,
 * without requiring its contents to re-render.  All of the child component's state is
 * preserved when toggling between inline and print views.
 *
 * State and DOM refs are managed via a PrintSupportModel, which must be provided.
 *
 * Not intended for application use.  Instead, make use of the print support provided by
 * {@link Panel} - // todo
 * {@link Grid}
 *
 * @internal
 */
export const printSupport = hoistCmp.factory({
    displayName: 'PrintSupport',
    model: uses(PrintSupportModel, {fromContext: false, publishMode: 'none'}),
    render({model, children}) {
        return fragment(
            // Simple 'box' cmp, inside which to place the child cmp when `model.isPrinting = false`
            inlineContainer({model}),

            // Render the child cmp inside the `model.hostNode` div.  This div is then placed
            // inside either the inlineContainer or printContainer in reaction to the state of
            // `model.isPrinting`
            createPortal(Children.only(children), model.hostNode) as ReactPortal
        );
    }
});

// Simple 'box' cmp, inside which to place the child cmp when `model.isModal = false`
const inlineContainer = hoistCmp.factory<PrintSupportModel>({
    render({model}) {
        return box({
            className: 'xh-print-support__inline',
            ref: model.inlineRef,
            height: '100%',
            display: 'inherit',
            flexDirection: 'inherit',

            // If not rendering within a container with flexDirection: row, take up all available
            // width:
            ...(model.inlineRef.current?.parentElement.style.flexDirection !== 'row'
                ? {width: '100%'}
                : {})
        });
    }
});
