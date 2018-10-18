/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {select} from '@xh/hoist/desktop/cmp/form';
import {DimensionChooserModel} from './DimensionChooserModel'
import {vbox, box} from '@xh/hoist/cmp/layout/index';

import './DimensionChooser.scss';

@HoistComponent
@LayoutSupport
export class DimensionChooser extends Component {

    baseClassName = 'xh-dim-chooser';

    constructor(props) {
        super(props);
        const {dimensions} = this.props;
        this.dimChooserModel = new DimensionChooserModel({
            dimensions
        })

    }

    render() {
        const {model, field} = this.props,
            {options, selectedDims} = this.dimChooserModel,
            dimRenderers = selectedDims.map((dim) => box(dim));
        return vbox(
            ...dimRenderers,
            select({
                model,
                field,
                options,
                onCommit: this.onCommit
            })
        )
    }

    onCommit = (v) => {
        this.dimChooserModel.addNewDimension(v);
    }
}
export const dimensionChooser = elemFactory(DimensionChooser);