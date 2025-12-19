/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {grid} from '@xh/hoist/cmp/grid';
import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, PlainObject, Some, uses} from '@xh/hoist/core';
import {MaskProps} from '@xh/hoist/cmp/mask';
import {panel, PanelProps} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import '@xh/hoist/desktop/register';
import {getTestId} from '@xh/hoist/utils/js';
import {isArray} from 'lodash';
import {cloneElement, isValidElement, ReactElement, ReactNode} from 'react';

import {restForm} from './impl/RestForm';
import {restGridToolbar} from './impl/RestGridToolbar';
import {RestGridModel} from './RestGridModel';

export interface RestGridProps
    extends HoistProps<RestGridModel>,
        Omit<PanelProps, 'model' | 'modelConfig' | 'modelRef'> {
    /**
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * AG Grid API. Use with care - settings made here might be overwritten and/or interfere with
     * the implementation of this component and its use of AG Grid.
     */
    agOptions?: PlainObject;

    /**
     * Optional components rendered adjacent to the top toolbar's action buttons.
     * See also {@link tbar} to take full control of the toolbar.
     */
    extraToolbarItems?: Some<ReactNode> | (() => Some<ReactNode>);

    /** Classname to be passed to RestForm. */
    formClassName?: string;

    /**
     * Mask to render on this Component. Defaults to true, which renders a standard Hoist mask.
     * Set to null/false for no mask, or pass a fully customized mask element.
     */
    mask?: ReactElement | boolean;

    /**
     * A custom toolbar to be docked above the grid. Note that this supersedes the default
     * toolbar, meaning the `extraToolbarItems` prop will be ignored, as will the `RestGridModel`
     * configs `toolbarActions`, `filterFields`, and `showRefreshButton`. If specified as an array,
     * will be passed as children to a Toolbar component.
     */
    tbar?: Some<ReactNode>;
}

export const [RestGrid, restGrid] = hoistCmp.withFactory<RestGridProps>({
    displayName: 'RestGrid',
    model: uses(RestGridModel, {publishMode: 'limited'}),
    className: 'xh-rest-grid',

    render(props, ref) {
        const {
                model,
                extraToolbarItems,
                tbar,
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
                tbar: innerToolbar({model, tbar, extraToolbarItems, testId}),
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

const innerToolbar = hoistCmp.factory({
    render({model, tbar, extraToolbarItems, testId}) {
        if (isArray(tbar)) return toolbar(tbar);
        if (tbar) return tbar;
        return restGridToolbar({model, extraToolbarItems, testId});
    }
});

function getMaskFromProp(model, mask) {
    if (isValidElement(mask)) {
        mask = cloneElement<MaskProps>(mask, {bind: model.loadObserver});
    } else if (mask === true) {
        mask = model.loadObserver;
    }
    return mask;
}
