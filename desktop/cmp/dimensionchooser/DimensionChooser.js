/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */
import {Component} from 'react';
import PT from 'prop-types';
import {elemFactory, HoistComponent} from '@xh/hoist/core';
import {vbox, hbox} from '@xh/hoist/cmp/layout/index';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {popover, Classes} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {div} from '@xh/hoist/cmp/layout';
import {withDefault} from '@xh/hoist/utils/js';
import {select} from '@xh/hoist/desktop/cmp/form';
import {size, isEmpty} from 'lodash';

import './DimensionChooser.scss';

/**
 * Control for selecting a list of dimensions for grouping APIs.
 *
 * @see DimensionChooserModel
 */
@HoistComponent
export class DimensionChooser extends Component {

    static propTypes = {

        /** Width in pixels of the target button (that triggers show of popover). */
        buttonWidth: PT.number,

        /** Title for popover (default "GROUP BY") or null to suppress. */
        popoverTitle: PT.string,

        /** Width in pixels of the popover menu itself. */
        popoverWidth: PT.number
    }

    baseClassName = 'xh-dim-chooser';

    INDENT = 10;        // Indentation applied at each level.
    X_BTN_WIDTH = 26;   // Width of 'x' buttons.
    LEFT_PAD = 5;       // Left-padding for inputs.

    get popoverWidth() {
        return withDefault(this.props.popoverWidth, 250);
    }

    get buttonWidth() {
        return withDefault(this.props.buttonWidth, 220);
    }

    render() {
        return div({
            className: this.getClassName(),
            item: this.renderDimensionMenu()
        });
    }

    //--------------------
    // Event Handlers
    //--------------------
    onTargetClick = () => {
        this.model.setIsAddNewOpen(isEmpty(this.model.history));
        this.model.setIsMenuOpen(true);
    }

    onDimChange = (dim, i) => {
        this.model.addPendingDim(dim, i);
    }

    onAddNewClick = () => {
        this.model.pendingValue = this.model.value;
        this.model.setIsAddNewOpen(true);
    }

    onSaveSelected = () => {
        this.model.commitPendingValue();
    }

    onBackSelected = () => {
        this.model.setIsAddNewOpen(false);
    }

    onSetFromHistory = (value) => {
        this.model.setValue(value);
    }

    onCancelSelected = () => {
        this.model.setIsMenuOpen(false);
    }

    onInteraction = (nextOpenState, e) => {
        if (nextOpenState === false) {
            if (this.model.isAddNewOpen) {
                const notSelectClick = withDefault(e, false) &&
                    withDefault(e.target, false) &&
                    withDefault(!e.target.classList.contains('xh-select__option'), false);
                if (notSelectClick) this.onSaveSelected();
            } else {
                this.model.setIsMenuOpen(false);
            }
        }
    };

    //---------------------------
    // Rendering top-level menus
    //---------------------------
    renderDimensionMenu() {
        const {value, dimensions, isMenuOpen, isAddNewOpen} = this.model;

        const target = button({
            item: value.map(it => dimensions[it].label).join(' \u203a '),
            width: this.buttonWidth,
            onClick: this.onTargetClick
        });

        const menuContent = isAddNewOpen ? this.renderAddNewMenu() : this.renderHistoryMenu();

        return popover({
            target,
            isOpen: isMenuOpen,
            targetClassName: 'xh-dim-popover',
            position: 'bottom',
            content: vbox({
                width: this.popoverWidth,
                ...menuContent
            }),
            onInteraction: (nextOpenState, e) => this.onInteraction(nextOpenState, e)
        });
    }

    renderAddNewMenu() {
        return {
            className: 'xh-dim-add-popover',
            items: [
                this.renderPopoverTitle(),
                this.renderSelectChildren(),
                buttonGroup({
                    className: 'xh-dim-nav-row',
                    items: [
                        button({
                            icon: Icon.arrowLeft(),
                            flex: 1,
                            omit: isEmpty(this.model.history),
                            onClick: this.onBackSelected
                        }),
                        button({
                            icon: Icon.check(),
                            flex: 2,
                            onClick: this.onSaveSelected
                        })
                    ]
                })
            ]
        };
    }

    renderHistoryMenu() {
        return {
            className: 'xh-dim-history-popover',
            items: [
                this.renderPopoverTitle(),
                this.renderHistoryItems(),
                buttonGroup({
                    className: 'xh-dim-nav-row',
                    minimal: true,
                    items: [
                        button({
                            icon: Icon.x(),
                            flex: 1,
                            onClick: this.onCancelSelected
                        }),
                        button({
                            icon: Icon.edit(),
                            flex: 2,
                            title: 'Add a new grouping',
                            onClick: this.onAddNewClick
                        })
                    ]
                })
            ]
        };
    }


    //--------------------
    // Render popover items
    //--------------------
    renderSelectChildren() {
        const {LEFT_PAD, INDENT, X_BTN_WIDTH, model} = this,
            {pendingValue, dimensions, maxDepth, leafInPending} = model;

        let children = pendingValue.map((dim, i) => {
            const options = model.dimOptionsForLevel(i),
                marginLeft = LEFT_PAD + (INDENT * i),
                width = this.popoverWidth - marginLeft - X_BTN_WIDTH;

            return hbox({
                className: 'xh-dim-popover-row',
                items: [
                    select({
                        options,
                        value: dimensions[dim].label,
                        disabled: isEmpty(options),
                        enableFilter: false,
                        width,
                        marginLeft,
                        onChange: (newDim) => this.onDimChange(newDim, i)
                    }),
                    button({
                        icon: Icon.x({className: 'xh-red'}),
                        maxWidth: X_BTN_WIDTH,
                        minWidth: X_BTN_WIDTH,
                        disabled: pendingValue.length === 1,
                        onClick: () => model.removePendingDim(dim)
                    })
                ]
            });
        });

        const atMaxDepth = (pendingValue.length === Math.min(maxDepth, size(dimensions)));
        if (!atMaxDepth && !leafInPending) {
            children.push(this.createAddSelect());
        }

        return vbox({
            className: 'xh-dim-popover-selects',
            items: children
        });
    }

    createAddSelect() {
        const {model, LEFT_PAD, INDENT, X_BTN_WIDTH} = this,
            {pendingValue} = model,
            pendingCount = pendingValue.length,
            marginLeft = LEFT_PAD + (pendingCount * INDENT),
            width = this.popoverWidth - marginLeft - X_BTN_WIDTH;

        return select({
            options: model.dimOptionsForLevel(pendingCount),
            enableFilter: false,
            placeholder: 'Add...',
            width,
            marginLeft,
            onChange: (newDim) => this.onDimChange(newDim, pendingCount)
        });
    }

    renderHistoryItems() {
        const {history, dimensions} = this.model;
        return buttonGroup({
            className: 'xh-dim-history-items',
            vertical: true,
            items: [
                history.map((value, i) => {
                    const labels = value.map(h => dimensions[h].label);
                    return button({
                        minimal: true,
                        title: ` ${labels.map((it, i) => ' '.repeat(i) + '\u203a '.repeat(i ? 1 : 0) + it).join('\n')}`,
                        text: labels.join(' \u203a '),
                        className: Classes.POPOVER_DISMISS,
                        key: `dim-history-${i}`,
                        onClick: () => this.onSetFromHistory(value)
                    });
                })
            ]
        });
    }

    renderPopoverTitle() {
        const title = withDefault(this.props.popoverTitle, 'Group By');
        if (!title) return null;

        return div({
            className: 'xh-dim-popover-title',
            item: title
        });
    }

}
export const dimensionChooser = elemFactory(DimensionChooser);