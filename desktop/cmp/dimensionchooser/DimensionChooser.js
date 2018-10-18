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
import {button} from '@xh/hoist/desktop/cmp/button';


import './DimensionChooser.scss';
import {HoistInput} from '@xh/hoist/cmp/form';
import {PropTypes as PT} from 'prop-types';
import {isEmpty} from 'lodash';

@HoistComponent
@LayoutSupport
export class DimensionChooser extends Component {

    static propTypes = {

        /** Array of grid dimensions, in ordered from least to most specific */
        dimensions: PT.array,
        /** Array of labels for grid dimensions. If not provided, model will
         * default to using Lodash's 'startCase' method on the dimensions object*/
        dimensionLabels: PT.object
        // Could potentially merge above to single prop. I.e. if array of objects, use provided labels. If array, use Lodash

    };

    static defaultProps = {
        placeholder: 'Select dimension...'
    };

    baseClassName = 'xh-dim-chooser';

    constructor(props) {
        super(props);
        const {dimensions, dimensionLabels, model, field} = this.props;
        this.dimChooserModel = new DimensionChooserModel({
            dimensions,
            dimensionLabels,
            model,
            field
        })
    }

    render() {
        const {model, field, placeholder} = this.props,
            {options, selectedDims, fmtDim} = this.dimChooserModel,
            renderedDims = selectedDims.map(dim => this.renderButton(dim));
        console.log(isEmpty(options))
        return vbox(
            box(selectedDims.map(fmtDim).join(' > ')),
            ...renderedDims,
            select({
                model,
                field,
                options,
                placeholder,
                renderText: 'Add dimension...',
                onCommit: this.onCommit,
                omit: isEmpty(options)
            })
        )
    }

    renderButton(dim) {
        return button({
            text: this.dimChooserModel.fmtDim(dim),
            onClick: () => this.onRemoveClick(dim)
        })
    }

    onRemoveClick = (dim) => {
        this.dimChooserModel.removeDimension(dim);
    }

    onCommit = (v) => {
        this.dimChooserModel.addDimension(v);
    }
}
export const dimensionChooser = elemFactory(DimensionChooser);