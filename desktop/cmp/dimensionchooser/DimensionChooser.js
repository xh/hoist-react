/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {select} from '@xh/hoist/desktop/cmp/form';
import {DimensionChooserModel} from './DimensionChooserModel';
import {vbox, box} from '@xh/hoist/cmp/layout/index';
import {button} from '@xh/hoist/desktop/cmp/button';
import {Icon} from '@xh/hoist/icon';
import {PropTypes as PT} from 'prop-types';
import {isEmpty} from 'lodash';
import {div, fragment, span} from '@xh/hoist/cmp/layout';
import {popover, tooltip} from '@xh/hoist/kit/blueprint';



import './DimensionChooser.scss';
import {throwIf} from '@xh/hoist/utils/js';
import {HoistInput} from '@xh/hoist/cmp/form';
import React from 'react';

@HoistComponent
@LayoutSupport
export class DimensionChooser extends Component {

    static propTypes = {

        /** Array of grid dimensions, in ordered from least to most specific */
        dimensions: PT.array,
        /** Array of labels for grid dimensions. If not provided, model will
         * default to using Lodash's 'startCase' method on the dimensions object*/
        dimensionLabels: PT.object,
        // Could potentially merge above to single prop. I.e. if array of objects, use provided labels. If array, use Lodash

    };

    static defaultProps = {
        placeholder: 'Select dimension...',
        width: 200
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
        });
    }

    render() {
        return div({
            className: this.baseClassName,
            item: this.prepareChild()
        })
    }

    onRemoveClick = (dim) => {
        this.dimChooserModel.removeDimension(dim);
    }

    onCommit = (v) => {
        this.dimChooserModel.addDimension(v);
    }


    //--------------------
    // Implementation
    //--------------------
    prepareChild() {
        const {model, field, placeholder, width} = this.props,
            {options, selectedDims, fmtDim} = this.dimChooserModel;

        // use throwIf() to handle exceptions here

        const dimSelect = select({
            model,
            field,
            options,
            renderText: isEmpty(selectedDims) ? placeholder : 'Add...',
            width,
            style: {width},
            onCommit: this.onCommit,
            omit: isEmpty(options)
        });

        if (isEmpty(selectedDims)) return dimSelect;

        const target = button({
                text: selectedDims.map(fmtDim).join(' > '),
                style: {width}
            }),
            // dimButtons = options.map((opt, i) => this.renderButton(opt, i));
            renderedDims = selectedDims.map((dim, i) => this.renderButton(dim, i));

        return popover({
            target,
            targetClassName: 'xh-dim-popover',
            wrapperTagName: 'div',
            targetTagName: 'div',
            position: 'bottom',
            content: vbox({
                width,
                className: 'xh-dim-popover-items',
                items: [
                    ...renderedDims,
                    dimSelect
                ]
            })
        });
    }

    renderButton(opt, i) {
        const marginLeft = this.props.width * i / 10;
        return button({
            style: {marginLeft},
            text: this.dimChooserModel.fmtDim(opt),
            icon: Icon.x(),
            onClick: () => this.onRemoveClick(opt)
        });
    }
}
export const dimensionChooser = elemFactory(DimensionChooser);