/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {cloneElement} from 'react';
import {hoistCmp, uses} from '@xh/hoist/core';
import {grid} from '@xh/hoist/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fragment} from '@xh/hoist/cmp/layout';
import {withDefault} from '@xh/hoist/utils/js';
import {isReactElement} from '@xh/hoist/utils/react';
import {restGridToolbar} from './impl/RestGridToolbar';
import {restForm} from './impl/RestForm';
import {RestGridModel} from './RestGridModel';
import PT from 'prop-types';
import {getLayoutProps} from '@xh/hoist/utils/react';

export const [RestGrid, restGrid] = hoistCmp.withFactory({
    displayName: 'RestGrid',
    model: uses(RestGridModel),
    className: 'xh-rest-grid',

    render({model, className, onRowDoubleClicked, ...props}) {

        if (!onRowDoubleClicked)  {
            onRowDoubleClicked = (row) => {
                if (!row.data) return;

                if (!model.readonly) {
                    model.formModel.openEdit(row.data);
                } else {
                    model.formModel.openView(row.data);
                }
            };
        }

        return fragment(
            panel({
                ...getLayoutProps(props),
                className,
                tbar: restGridToolbar({
                    extraToolbarItems: props.extraToolbarItems
                }),
                item: grid({
                    agOptions: props.agOptions,
                    onRowDoubleClicked
                }),
                mask: getMaskFromProps(model, props)
            }),
            restForm()
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
     * Callback to call when a row is double clicked. Function will receive an event
     * with a data node containing the row's data.
     */
    onRowDoubleClicked: PT.func
};


function getMaskFromProps(model, props) {
    let mask = withDefault(props.mask, true);

    if (isReactElement(mask)) {
        mask = cloneElement(mask, {model: model.loadModel});
    } else if (mask === true) {
        mask = model.loadModel;
    }
    return mask;
}