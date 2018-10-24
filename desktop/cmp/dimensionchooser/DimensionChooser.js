/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {PropTypes as PT} from 'prop-types';
import {vbox, hbox, box} from '@xh/hoist/cmp/layout/index';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroup, popover, Classes} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {div, hspacer} from '@xh/hoist/cmp/layout';
import {startCase, isEmpty, isPlainObject} from 'lodash';
import {select} from '@xh/hoist/desktop/cmp/form';
import {observable, action} from '@xh/hoist/mobx';

import {DimensionChooserModel} from './DimensionChooserModel';
import './DimensionChooser.scss';
import {throwIf, withDefault} from '@xh/hoist/utils/js';

@HoistComponent
@LayoutSupport
export class DimensionChooser extends Component {

    static propTypes = {

        /** Array of grid dimensions, in ordered from least to most specific */
        dimensions: PT.array,
        /** Maximum number of dimension settings to save in state */
        maxHistoryLength: PT.number,
        /** Flag to enable / disable indentation of each dimension. */
        indentLevels: PT.bool, /// Do we need this? No we dont
        /** Percentage of total width used to indent each level */
        indentWidthPct: PT.number,
        /** Maximum number of dimensions that can be set on the grid */
        maxDepth: PT.number
    };

    static defaultProps = {
        historyLength: 5,
        indentLevels: true,
        indentWidthPct: 5,
        placeholder: 'Select groupings...',
        width: 200
    };

    baseClassName = 'xh-dim-chooser';

    @observable isOpen = false;
    @action
    setPopoverDisplay(bool) {
        this.isOpen = bool;
    }

    constructor(props) {
        super(props);
        const {dimensions, historyLength, model, field, maxDepth} = this.props;
        this.internalDimensions = this.normalizeDimensions(dimensions);
        this.dimChooserModel = new DimensionChooserModel({
            dimensions: this.internalDimensions,
            historyLength,
            model,
            field
        });
        this.maxDepth = withDefault(maxDepth, dimensions.length);
    }

    render() {
        return div({
            className: this.baseClassName,
            items: [
                this.prepareDimensionMenu(),
                this.prepareOptionMenu()
            ]
        });
    }

    //--------------------
    // Event Handlers
    //--------------------

    onDimChange = (dim, i) => {
        this.dimChooserModel.addDim(dim, i);
    }

    onOptClick = (type) => {
        this.dimChooserModel.setDims(type);
    }

    onSaveSelected = () => {
        this.dimChooserModel.updateSelectedDims();
        this.setPopoverDisplay(false);
    }

    onCancelSelected = () => {
        this.dimChooserModel.setDims('last commit');
        this.setPopoverDisplay(false);
    }

    //--------------------
    // Implementation
    //--------------------

    prepareDimensionMenu() {
        const {placeholder, width} = this.props,
            {isOpen} = this,
            {selectedDims} = this.dimChooserModel;

        const target = button({
            item: isEmpty(selectedDims) ?
                placeholder :
                selectedDims.map(this.fmtDim).join(' > '),
            style: {width},
            placeholder,
            onClick: () => this.setPopoverDisplay(true)
        });
        const dimSelects = this.renderSelectChildren();

        return popover({
            target,
            isOpen,
            targetClassName: 'xh-dim-popover',
            wrapperTagName: 'div',
            targetTagName: 'div',
            position: 'bottom',
            content: vbox({
                width,
                className: 'xh-dim-popover-items',
                items: [
                    ...dimSelects,
                    hbox(
                        button({
                            icon: Icon.x(),
                            intent: 'danger',
                            style: {width: '40%'},
                            onClick: () => this.onCancelSelected()
                        }),
                        button({
                            icon: Icon.check(),
                            intent: 'success',
                            style: {width: '60%'},
                            onClick: () => this.onSaveSelected()
                        })
                    )
                ]
            })
        });
    }

    prepareOptionMenu() {
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
                        onClick: () => this.onOptClick('reset defaults')
                    })
                ]
            })
        });
    }

    renderSelectChildren() {
        const {width, indentLevels, indentWidthPct} = this.props;
        const {selectedDims, remainingDims} = this.dimChooserModel;
        const marginIncrement = indentLevels ? width * indentWidthPct / 100 : 0;
        let marginIndex = 0;
        const ret = selectedDims.map((dim, i) => {
            marginIndex++;
            const marginLeft = marginIncrement * marginIndex;
            return hbox({
                style: {marginLeft},
                items: [
                    select({
                        enableFilter: false,
                        options: this.prepareOptions(i),
                        value: this.fmtDim(dim),
                        onChange: (newDim) => this.onDimChange(newDim, i)
                    }),
                    button({
                        icon: Icon.x(),
                        disabled: selectedDims.length === 1,
                        onClick: () => this.dimChooserModel.removeDim(dim)
                    })
                ]
            });
        });
        if (selectedDims.length === this.maxDepth || this.dimChooserModel.leafSelected) return ret;
        marginIndex++;
        const marginLeft = marginIndex * marginIncrement;
        ret.push(
            box({
                style: {marginLeft},
                items: [
                    select({
                        enableFilter: false,
                        options: remainingDims.map((dim) => {
                            return {
                                label: this.fmtDim(dim),
                                value: dim
                            };
                        }),
                        onChange: (newDim) => this.onDimChange(newDim, selectedDims.length),
                        placeholder: 'Add...'
                    }),
                    hspacer(30)
                ]

            })
        );
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

    prepareOptions(i) {
        const lowerDims = this.dimChooserModel.selectedDims.slice(i + 1);
        const availDims = this.dimChooserModel.remainingDims;
        const displayDims = [...lowerDims, ...availDims];
        return this.internalDimensions.reduce((ret, dim) => {
            if (displayDims.includes(dim.value)) {
                ret.push({
                    value: dim.value,
                    label: dim.label
                });
            }
            return ret;
        }, []);
    }

    //-------------------------
    // Options / value handling
    //-------------------------

    normalizeDimensions(dims) {
        dims = dims || [];
        return dims.map(it => this.toRichDimension(it));
    }

    toRichDimension(src) {
        const srcIsObject = isPlainObject(src);

        throwIf(
            srcIsObject && !src.hasOwnProperty('value'),
            "Select options/values provided as Objects must define a 'value' property."
        );

        return srcIsObject ?
            {label: withDefault(src.label, src.value), isLeafColumn: withDefault(src.leaf, false), ...src} :
            {label: src != null ? src.toString() : '-null-', value: src, isLeafColumn: false};
    }

    fmtDim = (dim) => {
        return this.props.dimensionLabels ?
            this.props.dimensionLabels[dim] :
            startCase(dim);
    }
}

export const dimensionChooser = elemFactory(DimensionChooser);