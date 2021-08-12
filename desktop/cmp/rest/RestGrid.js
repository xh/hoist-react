/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */

import PT from 'prop-types';
import {cloneElement, isValidElement} from 'react';
import {grid} from '@xh/hoist/cmp/grid';
import {fragment} from '@xh/hoist/cmp/layout';
import {hoistCmp, ModelPublishMode, uses} from '@xh/hoist/core';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {apiRemoved} from '@xh/hoist/utils/js';

import {restForm} from './impl/RestForm';
import {restGridToolbar} from './impl/RestGridToolbar';
import {RestGridModel} from './RestGridModel';

export const [RestGrid, restGrid] = hoistCmp.withFactory({
    displayName: 'RestGrid',
    model: uses(RestGridModel, {publishMode: ModelPublishMode.LIMITED}),
    className: 'xh-rest-grid',

    render({
        model,
        extraToolbarItems,
        mask = true,
        agOptions,
        formClassName,
        ...props
    }, ref) {

        apiRemoved('RestGrid.onRowDoubleClicked', {test: props.onRowDoubleClicked, msg: 'Specify onRowDoubleClicked on the RestGridModel instead.', v: 'v43'});

        const {formModel, gridModel} = model;

        return fragment(
            panel({
                ref,
                ...props,
                tbar: restGridToolbar({model, extraToolbarItems}),
                item: grid({model: gridModel, agOptions}),
                mask: getMaskFromProp(model, mask)
            }),
            restForm({model: formModel, className: formClassName})
        );
    }
});

RestGrid.propTypes = {
    /**
     *
     * This constitutes an 'escape hatch' for applications that need to get to the underlying
     * ag-Grid API.  It should be used with care. Settings made here might be overwritten and/or
     * interfere with the implementation of this component and its use of the ag-Grid API.
     */
    agOptions: PT.object,

    /** Primary component model instance. */
    model: PT.oneOfType([PT.instanceOf(RestGridModel), PT.object]),

    /** Optional components rendered adjacent to the top toolbar's action buttons */
    extraToolbarItems: PT.oneOfType([PT.func, PT.array]),

    /**
     * Mask to render on this Component. Defaults to true, which renders a standard
     * Hoist mask. Also can be set to false for no mask, or passed an element
     * specifying a Mask instance.
     */
    mask: PT.oneOfType([PT.element, PT.bool]),

    /**
     * Classname to be passed to RestForm
     */
    formClassName: PT.string
};


function getMaskFromProp(model, mask) {
    if (isValidElement(mask)) {
        mask = cloneElement(mask, {bind: model.loadModel});
    } else if (mask === true) {
        mask = model.loadModel;
    }
    return mask;
}
