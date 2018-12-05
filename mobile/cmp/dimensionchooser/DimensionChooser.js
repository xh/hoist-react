/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2018 Extremely Heavy Industries Inc.
 */

import {Component} from 'react';
import {HoistComponent, elemFactory} from '@xh/hoist/core';
import PT from 'prop-types';

import {div} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {Icon} from '@xh/hoist/icon';
import {select} from '@xh/hoist/mobile/cmp/form';
import {withDefault} from '@xh/hoist/utils/js';
import {size, isEmpty} from 'lodash';

import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import './DimensionChooser.scss';


/**
 * Menu Component
 */
@HoistComponent
export class DimensionChooser extends Component {

    static propTypes = {
        /** Controlling model instance. */
        model: PT.instanceOf(DimensionChooserModel).isRequired,

        /** Width in pixels of the popover menu itself. */
        dialogWidth: PT.number
    };

    INDENT = 10;        // Indentation applied at each level.
    X_BTN_WIDTH = 26;   // Width of 'x' buttons.
    LEFT_PAD = 5;       // Left-padding for inputs.

    get dialogWidth() {
        return withDefault(this.props.dialogWidth, 250);
    }

    render() {
        const {model} = this,
            {value, dimensions} = model;
        return div(
            this.renderDialog(),
            button({
                text: value.map(it => dimensions[it].label).join(' \u203a '),
                onClick: () => model.showMenu()
            })
        );
    }

    onSetFromHistory = (value) => {
        this.model.setValue(value);
        this.model.closeMenu();
    }

    renderDialog() {
        const {model} = this,
            {isMenuOpen} = model;
        if (!model) return null;
        const {content, buttons} = this.getDialogProps();
        return dialog({
            className: 'xh-dim-dialog',
            title: 'Group By',
            content,
            buttons,
            isOpen: isMenuOpen,
            onCancel: () => model.commitPendingValue(),
            width: 260,
            align: 'left'
        });
    }

    getDialogProps() {
        return this.model.activeMode === 'history' ?
            {
                content: this.renderHistoryMenu(),
                buttons: this.renderHistoryButtons()
            } :
            {
                content: this.renderSelectMenu(),
                buttons: this.renderSelectButtons()
            };
    }

    renderHistoryMenu() {
        const {model} = this,
            {history, dimensions} = model;
        const historyItems = history.map((value, i) => {
            const labels = value.map(h => dimensions[h].label);
            return button({
                minimal: true,
                title: ` ${labels.map((it, i) => ' '.repeat(i) + '\u203a '.repeat(i ? 1 : 0) + it).join('\n')}`,
                text: labels.join(' \u203a '),
                key: `dim-history-${i}`,
                onClick: () => {
                    this.onSetFromHistory(value);
                }
            });
        });

        return div(
            ...historyItems
        );
    }

    renderHistoryButtons() {
        const {model} = this;
        return [
            button({
                icon: Icon.x(),
                onClick: () => model.closeMenu()
            }),
            button({
                icon: Icon.edit(),
                onClick: () => model.showEditor()
            })
        ];
    }

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
                        onChange: val => model.addPendingDim(val, i)
                    }),
                    button({
                        icon: Icon.x({className: 'xh-red'}),
                        disabled: pendingValue.length === 1,
                        onClick: () => {
                            model.removePendingDim(dim);
                            model.setShowAddSelect(false);
                        }
                    })
                ]
            });
        });
        const atMaxDepth = (pendingValue.length === Math.min(maxDepth, size(dimensions)));
        if (!atMaxDepth && !leafInPending) children.push(this.renderAddOrSelectButton());
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
                onChange: val => model.addPendingDim(val, pendingCount)
            }) :
            button({
                text: 'Add grouping...',
                style: {marginLeft, width},
                icon: Icon.add({className: 'xh-green'}),
                onClick: () => model.setShowAddSelect(true)
            });
    }

    renderSelectButtons() {
        const {model} = this;
        return [
            button({
                icon: Icon.arrowLeft(),
                omit: isEmpty(history),
                onClick: () => model.showHistory()
            }),
            button({
                icon: Icon.check({className: 'xh-green'}),
                onClick: () => model.commitPendingValue()
            })
        ];
    }
}

export const dimensionChooser = elemFactory(DimensionChooser);