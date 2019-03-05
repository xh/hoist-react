/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import PT from 'prop-types';

import {fragment, div, span} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {Icon} from '@xh/hoist/icon';
import {select} from '@xh/hoist/mobile/cmp/input';
import {withDefault} from '@xh/hoist/utils/js';
import {size, isEmpty} from 'lodash';

import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import './DimensionChooser.scss';

/**
 * Control for selecting a list of dimensions for grouping APIs.
 */
@HoistComponent
export class DimensionChooser extends Component {

    static modelClass = DimensionChooserModel;

    static propTypes = {
        /** Width in pixels of the target button (that triggers show of popover). */
        buttonWidth: PT.number,

        /** Width in pixels of the popover menu itself. */
        dialogWidth: PT.number
    };

    baseClassName = 'xh-dim-chooser';

    INDENT = 10;        // Indentation applied at each level.
    X_BTN_WIDTH = 26;   // Width of 'x' buttons.
    LEFT_PAD = 5;       // Left-padding for inputs.

    get dialogWidth() {
        return withDefault(this.props.dialogWidth, 250);
    }

    get buttonWidth() {
        return withDefault(this.props.buttonWidth, 150);
    }

    render() {
        const {model} = this,
            {value, dimensions} = model;

        return div(
            this.renderDialog(),
            button({
                className: 'xh-dim-button',
                item: span(value.map(it => dimensions[it].label).join(' \u203a ')),
                width: this.buttonWidth,
                onClick: () => model.showMenu()
            })
        );
    }

    //--------------------
    // Event Handlers
    //--------------------
    onDimChange = (dim, i) => {
        this.model.addPendingDim(dim, i);
    }

    onSetFromHistory = (value) => {
        this.model.setValue(value);
        this.model.closeMenu();
    }

    //---------------------------
    // Rendering dialog
    //---------------------------
    renderDialog() {
        const {model} = this;
        if (!model) return null;

        return dialog({
            className: this.getClassName('xh-dim-dialog'),
            title: 'Group By',
            isOpen: model.isMenuOpen,
            onCancel: () => model.commitPendingValueAndClose(),
            width: this.dialogWidth,
            align: 'left',
            ...this.getDialogPropsForMode(model.activeMode)
        });
    }

    getDialogPropsForMode(mode) {
        return mode === 'history' ?
            {
                content: this.renderHistoryMenu(),
                buttons: this.renderHistoryButtons()
            } :
            {
                content: this.renderSelectMenu(),
                buttons: this.renderSelectButtons()
            };
    }

    //---------------------------
    // Rendering history mode
    //---------------------------
    renderHistoryMenu() {
        const {model} = this,
            {history, dimensions} = model;

        const historyItems = history.map((value, i) => {
            const labels = value.map(h => dimensions[h].label);
            return button({
                className: 'dim-history-btn',
                title: ` ${labels.map((it, i) => ' '.repeat(i) + '\u203a '.repeat(i ? 1 : 0) + it).join('\n')}`,
                text: labels.join(' \u203a '),
                key: `dim-history-${i}`,
                modifier: 'quiet',
                onClick: () => {
                    this.onSetFromHistory(value);
                }
            });
        });

        return fragment(...historyItems);
    }

    renderHistoryButtons() {
        const {model} = this;
        return [
            button({
                icon: Icon.x(),
                modifier: 'quiet',
                flex: 1,
                onClick: () => model.closeMenu()
            }),
            button({
                icon: Icon.edit(),
                modifier: 'quiet',
                flex: 1,
                onClick: () => model.showEditor()
            })
        ];
    }

    //---------------------------
    // Rendering select mode
    //---------------------------
    renderSelectMenu() {
        const {LEFT_PAD, INDENT, X_BTN_WIDTH, model} = this,
            {pendingValue, dimensions, maxDepth, leafInPending} = model;

        const children = pendingValue.map((dim, i) => {
            const options = [dimensions[dim], ...model.dimOptionsForLevel(i)],
                marginLeft = LEFT_PAD + (INDENT * i),
                width = this.dialogWidth - marginLeft - X_BTN_WIDTH;

            return div({
                className: 'xh-dim-dialog-select-row',
                items: [
                    select({
                        options,
                        width,
                        marginLeft,
                        value: dim,
                        onChange: val => this.onDimChange(val, i)
                    }),
                    button({
                        icon: Icon.x({className: 'xh-red'}),
                        disabled: pendingValue.length === 1,
                        modifier: 'quiet',
                        onClick: () => {
                            model.removePendingDim(dim);
                            model.setShowAddSelect(false);
                        }
                    })
                ]
            });
        });

        const atMaxDepth = (pendingValue.length === Math.min(maxDepth, size(dimensions)));
        if (!atMaxDepth && !leafInPending) {
            children.push(this.renderAddOrSelectButton());
        }

        return children;
    }

    renderAddOrSelectButton() {
        // can update to match dimension chooser add/select logic
        const {model, LEFT_PAD, INDENT, X_BTN_WIDTH} = this,
            {pendingValue} = model,
            pendingCount = pendingValue.length,
            marginLeft = LEFT_PAD + (pendingCount * INDENT),
            width = this.dialogWidth - marginLeft - X_BTN_WIDTH;

        return model.showAddSelect ?
            select({
                options: model.dimOptionsForLevel(pendingCount),
                width,
                marginLeft,
                onChange: val => this.onDimChange(val, pendingCount)
            }) :
            button({
                text: 'Add grouping...',
                style: {marginLeft, width},
                icon: Icon.add({className: 'xh-green'}),
                modifier: 'quiet',
                onClick: () => model.setShowAddSelect(true)
            });
    }

    renderSelectButtons() {
        const {model} = this;
        return [
            button({
                icon: Icon.arrowLeft(),
                omit: isEmpty(model.history),
                modifier: 'quiet',
                flex: 1,
                onClick: () => model.showHistory()
            }),
            button({
                icon: Icon.check({className: 'xh-green'}),
                modifier: 'quiet',
                flex: 1,
                onClick: () => model.commitPendingValueAndClose()
            })
        ];
    }
}

export const dimensionChooser = elemFactory(DimensionChooser);