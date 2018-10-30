/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import {elemFactory, HoistComponent, LayoutSupport} from '@xh/hoist/core';
import {vbox, hbox, box} from '@xh/hoist/cmp/layout/index';
import {button} from '@xh/hoist/desktop/cmp/button';
import {buttonGroup, popover, Classes} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {div} from '@xh/hoist/cmp/layout';
import {withDefault} from '@xh/hoist/utils/js';
import {isEqual} from 'lodash';
import {select} from '@xh/hoist/desktop/cmp/form';

import './DimensionChooser.scss';

@HoistComponent
@LayoutSupport
export class DimensionChooser extends Component {

    static defaultProps = {
        width: 200
    };

    baseClassName = 'xh-dim-chooser';

    constructor(props) {
        super(props);
    }

    render() {
        return div({
            className: this.baseClassName,
            item: this.prepareDimensionMenu()
        });
    }

    //--------------------
    // Event Handlers
    //--------------------

    onDimChange = (dim, i) => {
        this.model.addDim(dim, i);
    }

    onAddNewClick = () => {
        this.model.setDisplayHistory(false);
    }

    onOptClick = (type) => {
        this.model.setDims(type);
    }

    onSaveSelected = () => {
        this.model.saveDimensions();
    }

    onCancelSelected = () => {
        this.model.setDims('last commit');
    }

    onResetFromHistory = (idx) => {
        this.model.setDimsFromHistory(idx);
    }

    onSaveDefault = () => {
        this.model.setDims('new default');
    }

    onRestoreDefault = () => {
        this.model.setDims('restore default');
    }

    onInteraction = (nextOpenState, e) => {
        const notSelectClick = withDefault(e, false) &&
            withDefault(e.target, false) &&
            withDefault(!e.target.classList.contains('xh-select__option'), false);
        /*
         * Should be checking for a class which we pass from this component to the select menu.
         * For now should be fine, but should update once feature is added to select component.
         */

        if (nextOpenState === false && notSelectClick) {
            this.onSaveSelected();
        }
    };

    //--------------------
    // Rendering top-level menus
    //--------------------

    prepareDimensionMenu() {
        const {width} = this.props,
            {dimensions, toRichDim, isMenuOpen, displayHistoryItems} = this.model;

        const target = button({
            item: toRichDim(dimensions).map(it => it.label).join(' > '),
            style: {width},
            onClick: () => this.model.setPopoverDisplay(true)
        });

        const content = displayHistoryItems ? this.renderHistory() : this.renderAddNew();

        return popover({
            target,
            isOpen: isMenuOpen,
            onInteraction: (nextOpenState, e) => this.onInteraction(nextOpenState, e),
            targetClassName: 'xh-dim-popover',
            position: 'bottom',
            content
        });
    }

    renderAddNew() {
        const dimSelects = this.renderSelectChildren(),
            {width} = this.props;

        return vbox({
            width,
            className: 'xh-dim-add-popover',
            items: [
                vbox({
                    className: 'xh-dim-popover-selects',
                    items: [...dimSelects]
                }),
                buttonGroup({
                    items: [
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
                    ]
                })
            ]
        });
    }

    renderHistory() {
        const {width} = this.props,
            {defaultDims, selectedDims} = this.model,
            defaultSelected = isEqual(defaultDims, selectedDims);

        return vbox({
            width,
            className: 'xh-dim-history-popover',
            items: [
                this.renderHistoryItems(),
                buttonGroup({
                    items: [
                        popover({
                            position: 'bottom-left',
                            minimal: true,
                            target: button({
                                style: {width: 65},
                                icon: Icon.gear()
                            }),
                            content: buttonGroup({
                                className: Classes.POPOVER_DISMISS,
                                vertical: true,
                                style: {width},
                                items: [
                                    button({
                                        text: 'Save current as default',
                                        disabled: defaultSelected,
                                        onClick: this.onSaveDefault
                                    }),
                                    button({
                                        text: 'Restore default view',
                                        disabled: defaultSelected,
                                        onClick: this.onRestoreDefault
                                    })
                                ]
                            })
                        }),
                        button({
                            style: {flex: 1},
                            icon: Icon.add(),
                            intent: 'primary',
                            onClick: this.onAddNewClick
                        })
                    ]
                })
            ]
        });
    }

    //--------------------
    // Render popover items
    //--------------------

    renderSelectChildren() {
        const {width} = this.props,
            {selectedDims, availableDims, toRichDim, maxDepth, leafSelected} = this.model,
            marginIncrement = width * 5 / 100;
        const ret = selectedDims.map((dim, i) => {
            const marginLeft = marginIncrement * i;
            return hbox({
                className: 'xh-dim-popover-row',
                style: {marginLeft},
                items: [
                    select({
                        enableFilter: false,
                        options: availableDims(i),
                        value: toRichDim(dim).label,
                        onChange: (newDim) => this.onDimChange(newDim, i)
                    }),
                    button({
                        icon: Icon.x(),
                        minimal: true,
                        disabled: selectedDims.length === 1,
                        onClick: () => this.model.removeDim(dim)
                    })
                ]
            });
        });

        return selectedDims.length === maxDepth || leafSelected ?
            ret :
            this.appendAddDim(ret);
    }

    appendAddDim(ret) {
        const {selectedDims, remainingDims} = this.model;
        const marginLeft = (selectedDims.length) * this.props.width * 5 / 100;
        ret.push(
            box({
                style: {marginLeft},
                items: [
                    select({
                        className: 'xh-dim-popover-add-dim',
                        enableFilter: false,
                        options: remainingDims,
                        onChange: (newDim) => this.onDimChange(newDim, selectedDims.length),
                        placeholder: 'Add...'
                    })
                ]
            })
        );
        return ret;

    }

    renderHistoryItems() {
        const {history, toRichDim} = this.model;
        return buttonGroup({
            className: 'xh-dim-history-items',
            vertical: true,
            items: [
                history.map((h, i) => {
                    h = toRichDim(h);
                    return button({
                        minimal: true,
                        title: `${h.map((it, i) => ' '.repeat(i*2) + '\u21d2 '.repeat(i ? 1 : 0) + it.label).join('\n')}`,
                        text: `${h.map(it => it.label).join(' > ')}`,
                        onClick: () => this.onResetFromHistory(i),
                        className: Classes.POPOVER_DISMISS,
                        key: `dim-history-${i}`
                    });
                })
            ]
        });
    }
}

export const dimensionChooser = elemFactory(DimensionChooser);