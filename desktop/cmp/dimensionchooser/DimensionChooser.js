/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {PropTypes as PT} from 'prop-types';
import {vbox, hbox} from '@xh/hoist/cmp/layout/index';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroup, popover, Classes} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {div} from '@xh/hoist/cmp/layout';
import {startCase, isEmpty} from 'lodash';
import {select} from '@xh/hoist/desktop/cmp/form';


import {DimensionChooserModel} from './DimensionChooserModel';
import './DimensionChooser.scss';

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

        /** Maximum number of dimension settings to save in state */
        historyLength: PT.number, // maxhistory ?
        /** Flag to enable / disable indentation of each dimension. */
        indentLevels: PT.bool, /// Do we need this? No we dont
        /** Percentage of total width used to indent each level */
        indentWidthPct: PT.number

        //maxDepth - default to all dimensions



    };

    static defaultProps = {
        historyLength: 5,
        indentLevels: true,
        indentWidthPct: 5,
        placeholder: 'Select groupings...',
        width: 200
    };

    baseClassName = 'xh-dim-chooser';

    constructor(props) {
        super(props);
        const {dimensions, dimensionLabels, historyLength, model, field} = this.props;
        this.dimChooserModel = new DimensionChooserModel({
            dimensions,
            dimensionLabels,
            historyLength,
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
        });
    }

    onDimChange = (dim, i) => {
        this.dimChooserModel.addDim(dim, i);
    }

    onOptClick = (type) => {
        this.dimChooserModel.setDims(type);
    }

    onDimsPopoverClose = () => {
        this.dimChooserModel.saveHistory();
    }

    //--------------------
    // Implementation
    //--------------------
    prepareDimensions() {
        const {placeholder, width} = this.props,
            {selectedDims} = this.dimChooserModel;

        const target = button({
                item: isEmpty(selectedDims) ?
                    placeholder :
                    selectedDims.map(this.fmtDim).join(' > '),
                style: {width},
                placeholder
            }), dimSelects = this.renderSelectChildren();

        return popover({
            target,
            targetClassName: 'xh-dim-popover',
            wrapperTagName: 'div',
            targetTagName: 'div',
            position: 'bottom',
            content: vbox({
                width,
                className: `xh-dim-popover-items`,
                items: [...dimSelects]
            }),
            onClose: () => this.onDimsPopoverClose()
        });
    }

    prepareOptions() {
        const target =  button({
            icon: Icon.ellipsisV(),
            className: 'xh-dim-options'
        });

        return popover({
            target,
            position: 'bottom-right',
            content: buttonGroup({
                vertical: true,
                className: 'xh-dim-opts-popover-items',
                items: [
                    button({
                        text: 'Show all',
                        onClick: () => this.onOptClick('all')
                    }),
                    button({
                        text: 'Hide all',
                        onClick: () => this.onOptClick('clear')
                    }),
                    popover({
                        disabled: isEmpty(this.dimChooserModel.history),
                        target: button({
                            className: 'xh-dim-opts-history',
                            text: 'History',
                            rightIcon: 'caret-right'
                        }),
                        position: 'auto',
                        content: this.renderHistory(),
                        interactionKind: 'hover',
                        openOnTargetFocus: false
                    }),
                    button({
                        text: 'Reset defaults',
                        onClick: () => this.onOptClick('reset')
                    })
                ]
            })
        });
    }

    renderSelectChildren() {
        const {dimensions, width, indentLevels, indentWidthPct} = this.props;
        const {selectedDims, remainingDims} = this.dimChooserModel;
        const marginIncrement = indentLevels ? width * indentWidthPct / 100 : 0;
        let marginIndex = 0;
        const ret = selectedDims.map((dim, i) => {
            marginIndex++;
            const marginLeft = marginIncrement * marginIndex;
            return hbox(

                select({
                    width: width - marginLeft - 35,
                    options: remainingDims.map((dim) => {
                        return {
                            label: this.fmtDim(dim),
                            value: dim
                        }
                    }),
                    value: this.fmtDim(dim),
                    onChange: (newDim) => this.onDimChange(newDim, i),
                    style: {marginLeft},
                }),
                button({
                    icon: Icon.x(),
                    disabled: selectedDims.length === 1,
                    onClick: () => this.dimChooserModel.removeDim(dim)
                })

            )
        });
        if (selectedDims.length === dimensions.length) return ret;
        marginIndex++;
        const marginLeft = marginIndex * marginIncrement;
        ret.push(
            select({
                width: width - marginLeft - 35,
                options: remainingDims.map((dim) => {
                    return {
                        label: this.fmtDim(dim),
                        value: dim
                    }
                }),
                onChange: (newDim) => this.onDimChange(newDim, selectedDims.length),
                style: {marginLeft},
                placeholder: 'Add dimension...'
            })

        )
        return ret;
    }

    renderHistory() {
        return buttonGroup({
            className: 'xh-dim-history-items',
            vertical: true,
            items: [
                this.dimChooserModel.history.map((h, i) => {
                    return button({
                        text: `${i+1}. ${h.map(this.fmtDim).join(' > ')}`,
                        onClick: () => this.dimChooserModel.setDimsFromHistory(h),
                        className: Classes.POPOVER_DISMISS,
                        key: `dim-history-${i}`
                    });
                })
            ]
        });
    }

    fmtDim = (dim) => {
        return this.props.dimensionLabels ?
            this.props.dimensionLabels[dim] :
            startCase(dim);
    }
}

export const dimensionChooser = elemFactory(DimensionChooser);