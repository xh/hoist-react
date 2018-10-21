/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {PropTypes as PT} from 'prop-types';
import {vbox} from '@xh/hoist/cmp/layout/index';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroup, popover, Classes} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {div} from '@xh/hoist/cmp/layout';
import {startCase, isEmpty} from 'lodash';

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
        historyLength: PT.number,
        /** Flag to enable / disable indentation of each dimension. */
        indentLevels: PT.bool,
        /** Percentage of total width used to indent each level */
        indentWidthPct: PT.number

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

    onDimClick = (dim) => {
        this.dimChooserModel.handleDim(dim);
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
                items: [...dimButtons]
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
                            rightIcon: Icon.caretRight(),
                            text: 'History'
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

    renderButton(dim, i) {
        const {width, indentLevels, indentWidthPct} = this.props;
        const marginLeft = indentLevels ? width * i * indentWidthPct / 100 : 0,
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