/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {DimensionChooserModel} from './DimensionChooserModel';
import {vbox, box} from '@xh/hoist/cmp/layout/index';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroup} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {PropTypes as PT} from 'prop-types';
import {div, fragment, span} from '@xh/hoist/cmp/layout';
import {popover, tooltip} from '@xh/hoist/kit/blueprint';
import {startCase, last, isEmpty, pull, isFunction, upperFirst, indexOf, difference} from 'lodash';




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
         * default to using Lodash's 'startCase' method on props.dimensions */
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
            items: [
                this.prepareDimensions(),
                this.prepareOptions()
            ]
        })
    }

    onDimClick = (dim) => {
        this.dimChooserModel.handleDim(dim);
    }

    onOptClick = (type) => {
        this.dimChooserModel.setDims(type);
    }

    //--------------------
    // Implementation
    //--------------------
    prepareDimensions() {
        const {dimensions, placeholder, width} = this.props,
            {orderedDims} = this.dimChooserModel;

        const target = button({
            item: isEmpty(orderedDims) ?
                placeholder :
                orderedDims.map(this.fmtDim).join(' > '),
            style: {width},
            placeholder
        }), dimButtons = dimensions.map((dim, i) => this.renderButton(dim, i));

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
                    ...dimButtons,
                ]
            })
        });
    }

    prepareOptions() {
        const target =  button({
            icon: Icon.ellipsisV(),
            className: 'xh-dim-options'
        })

        return popover({
            target,
            position: 'bottom-right',
            content: buttonGroup({
                vertical: true,
                className: 'xh-dim-opts-popover-items',
                items: [
                    button({
                        text: 'Add all',
                        onClick: () => this.onOptClick('all')
                    }),
                    button({
                        text: 'Clear all',
                        onClick: () => this.onOptClick('clear')
                    }),
                    button({
                        text: 'Reset defaults',
                        onClick: () => this.onOptClick('reset')
                    }),
                    popover({
                        disabled: isEmpty(this.dimChooserModel.history),
                        target: button({
                            icon: Icon.caretLeft(),
                            text: 'History'
                        }),
                        position: 'auto',
                        content: this.renderHistory(),
                        interactionKind: 'hover',
                        openOnTargetFocus: false
                    })
                ]
            })
        })
    }

    renderButton(dim, i) {
        const marginLeft = this.props.width * i / 10,
            selected = this.dimChooserModel.selectedDims.includes(dim);
        return button({
            style: {marginLeft},
            text: this.fmtDim(dim),
            icon: selected ? Icon.eye() : Icon.eyeSlash(),
            className: selected ? 'xh-dim-selected' : 'xh-dim-not-selected',
            onClick: () => this.onDimClick(dim)
        });
    }

    renderHistory() {
        return buttonGroup({
            vertical: true,
            items: [
                this.dimChooserModel.history.map((h) => {
                    return button({
                        text: h.map(this.fmtDim).join(' > '),
                        onClick: () => this.dimChooserModel.setDimsFromHistory(h)
                    })
                })
            ]
        })
    }

    fmtDim = (dim) => {
        return this.props.dimensionLabels ?
            this.props.dimensionLabels[dim] :
            startCase(dim);
    }
}

export const dimensionChooser = elemFactory(DimensionChooser);