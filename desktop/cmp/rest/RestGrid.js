/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {Component, cloneElement} from 'react';
import {HoistComponent, elemFactory, LayoutSupport} from '@xh/hoist/core';

import {grid} from '@xh/hoist/cmp/grid';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {fragment} from '@xh/hoist/cmp/layout';
import {withDefault} from '@xh/hoist/utils/js';
import {isReactElement} from '@xh/hoist/utils/react';
import {restGridToolbar} from './impl/RestGridToolbar';
import {restForm} from './impl/RestForm';
import {RestGridModel} from './RestGridModel';
import PT from 'prop-types';

@HoistComponent
@LayoutSupport
export class RestGrid extends Component {

    static modelClass = RestGridModel;

    static propTypes = {
        /**
         *
         * This constitutes an 'escape hatch' for applications that need to get to the underlying
         * ag-Grid API.  It should be used with care. Settings made here might be overwritten and/or
         * interfere with the implementation of this component and its use of the ag-Grid API.
         */
        agOptions: PT.object,

        /** Optional components rendered adjacent to the top toolbar's action buttons */
        extraToolbarItems: PT.func,

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

    baseClassName = 'xh-rest-grid';

    render() {
        const {model, props} = this,
            onRowDoubleClicked = withDefault(props.onRowDoubleClicked, this.onRowDoubleClicked);

        return fragment(
            panel({
                ...this.getLayoutProps(),
                className: this.getClassName(),
                tbar: restGridToolbar({
                    model,
                    extraToolbarItems: props.extraToolbarItems
                }),
                item: grid({
                    model: model.gridModel,
                    agOptions: props.agOptions,
                    onRowDoubleClicked
                }),
                mask: this.getMaskFromProps()
            }),
            restForm({model: model.formModel})
        );
    }

    //------------------------
    // Implementation
    //------------------------
    onRowDoubleClicked = (row) => {
        if (!row.data) return;

        const {readonly, formModel} = this.model;
        if (!readonly) {
            formModel.openEdit(row.data);
        } else {
            formModel.openView(row.data);
        }
    }

    getMaskFromProps() {
        const {model, props} = this;
        let mask = withDefault(props.mask, true);

        if (isReactElement(mask)) {
            mask = cloneElement(mask, {model: model.loadModel});
        } else if (mask === true) {
            mask = model.loadModel;
        }
        return mask;
    }
}
export const restGrid = elemFactory(RestGrid);