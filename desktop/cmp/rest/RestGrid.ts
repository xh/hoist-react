/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {grid} from '@xh/hoist/cmp/grid';
import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, PlainObject, Some, uses, WithoutModelAndRef} from '@xh/hoist/core';
import {MaskProps} from '@xh/hoist/desktop/cmp/mask';
import {panel, PanelProps} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {getTestId} from '@xh/hoist/utils/js';
import {cloneElement, isValidElement, ReactElement, ReactNode} from 'react';
import {restForm} from './impl/RestForm';
import {restGridToolbar} from './impl/RestGridToolbar';
import {RestGridModel} from './RestGridModel';

export interface RestGridProps
    extends HoistProps<RestGridModel, HTMLDivElement>,
        WithoutModelAndRef<PanelProps> {
    /**
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * ag-Grid API.  It should be used with care. Settings made here might be overwritten and/or
     * interfere with the implementation of this component and its use of the ag-Grid API.
     */
    agOptions?: PlainObject;

    /** Optional components rendered adjacent to the top toolbar's action buttons */
    extraToolbarItems?: Some<ReactNode> | (() => Some<ReactNode>);

    /**
     * Mask to render on this Component. Defaults to true, which renders a standard
     * Hoist mask. Also can be set to false for no mask, or passed an element
     * specifying a Mask instance.
     */
    mask?: ReactElement | boolean;

    /** Classname to be passed to RestForm. */
    formClassName?: string;
}

export const [RestGrid, restGrid] = hoistCmp.withFactory<RestGridProps>({
    displayName: 'RestGrid',
    model: uses(RestGridModel, {publishMode: 'limited'}),
    className: 'xh-rest-grid',

    render(props, ref) {
        const {
                model,
                extraToolbarItems,
                mask = true,
                agOptions,
                formClassName,
                testId,
                ...restProps
            } = props,
            {formModel, gridModel} = model;

        return fragment(
            panel({
                ref,
                ...restProps,
                tbar: restGridToolbar({model, extraToolbarItems, testId}),
                item: grid({model: gridModel, agOptions, testId: getTestId(testId, 'grid')}),
                mask: getMaskFromProp(model, mask)
            }),
            restForm({
                model: formModel,
                className: formClassName,
                testId: getTestId(testId, 'form')
            })
        );
    }
});

function getMaskFromProp(model, mask) {
    if (isValidElement(mask)) {
        mask = cloneElement<MaskProps>(mask, {bind: model.loadModel});
    } else if (mask === true) {
        mask = model.loadModel;
    }
    return mask;
}
