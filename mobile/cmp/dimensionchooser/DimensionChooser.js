/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import PT from 'prop-types';

import {fragment, div, span, filler} from '@xh/hoist/cmp/layout';
import {button} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {Icon} from '@xh/hoist/icon';
import {select} from '@xh/hoist/mobile/cmp/input';
import {size, isEmpty} from 'lodash';
import classNames from 'classnames';

import {DimensionChooserModel} from '@xh/hoist/cmp/dimensionchooser';
import './DimensionChooser.scss';


const INDENT = 10;        // Indentation applied at each level.
const X_BTN_WIDTH = 26;   // Width of 'x' buttons.
const LEFT_PAD = 5;       // Left-padding for inputs.

/**
 * Control for selecting a list of dimensions for grouping APIs.
 */
export const [DimensionChooser, dimensionChooser] = hoistCmp.withFactory({
    displayName: 'DimensionChooser',
    model: uses(DimensionChooserModel),
    className: 'xh-dim-chooser',

    render({
        model,
        dialogWidth = 250,
        buttonWidth = 150,
        emptyText = '[Ungrouped]'
    }) {
        const {value, dimensions} = model,
            labels = isEmpty(value) ? [emptyText] : value.map(h => dimensions[h].label);

        return div(
            dialogCmp({dialogWidth, emptyText}),
            button({
                className: 'xh-dim-button',
                item: span(labels.join(' \u203a ')),
                width: buttonWidth,
                onClick: () => model.showMenu()
            })
        );
    }
});
DimensionChooser.propTypes = {
    /** Width in pixels of the target button (that triggers show of popover). */
    buttonWidth: PT.number,

    /** Width in pixels of the popover menu itself. */
    dialogWidth: PT.number,

    /** Text to represent empty state (i.e. value = null or [])*/
    emptyText: PT.string,

    /** Primary component model instance. */
    model: PT.instanceOf(DimensionChooserModel)
};

//---------------------------
// Rendering dialog
//---------------------------
const dialogCmp = hoistCmp.factory(
    ({model, dialogWidth, emptyText}) => {
        const isHistory = (model.activeMode === 'history'),
            buttons = isHistory ? [
                button({icon: Icon.x(), flex: 1, onClick: () => model.closeMenu()}),
                button({icon: Icon.edit(), flex: 1, onClick: () => model.showEditor()})
            ]: [
                button({icon: Icon.arrowLeft(), flex: 1, onClick: () => model.showHistory(), omit: isEmpty(model.history)}),
                button({icon: Icon.check(), flex: 1, onClick: () => model.commitPendingValueAndClose()})
            ];

        return dialog({
            className: classNames(model, 'xh-dim-dialog'),
            title: 'Group By',
            icon: Icon.treeList(),
            isOpen: model.isMenuOpen,
            onCancel: () => model.commitPendingValueAndClose(),
            width: dialogWidth,
            align: 'left',
            content: isHistory ? historyMenu({emptyText}) : selectMenu({dialogWidth, emptyText}),
            buttons
        });
    }
);

//---------------------------
// Rendering history mode
//---------------------------
const historyMenu = hoistCmp.factory(
    ({model, emptyText}) => {
        const {history, dimensions} = model,
            historyItems = history.map((value, i) => {
                const isActive = value === model.value,
                    labels = isEmpty(value) ? [emptyText] : value.map(h => dimensions[h].label);

                return button({
                    className: classNames('dim-history-btn', isActive ? 'dim-history-btn--active' : null),
                    key: `dim-history-${i}`,
                    modifier: 'quiet',
                    items: [
                        span(` ${labels.map((it, i) => ' '.repeat(i) + '\u203a '.repeat(i ? 1 : 0) + it).join('\n')}`),
                        filler(),
                        div({item: isActive ? Icon.check() : null, style: {width: 25}})
                    ],
                    onClick: () => {
                        model.setValue(value);
                        model.closeMenu();
                    }
                });
            });
        return fragment(historyItems);
    }
);

//---------------------------
// Rendering select mode
//---------------------------
const selectMenu = hoistCmp.factory(
    ({model, dialogWidth, emptyText}) => {
        const {showAddSelect, pendingValue, dimensions, maxDepth, leafInPending, enableClear} = model;

        const children = pendingValue.map((dim, i) => {
            const options = model.dimOptionsForLevel(i, dim),
                marginLeft = LEFT_PAD + (INDENT * i),
                width = dialogWidth - marginLeft - X_BTN_WIDTH;

            return div({
                className: 'xh-dim-dialog-select-row',
                items: [
                    select({
                        options,
                        width,
                        marginLeft,
                        value: dim,
                        onChange: (val) => model.addPendingDim(val, i)
                    }),
                    button({
                        icon: Icon.x({className: 'xh-red'}),
                        disabled: !enableClear && pendingValue.length === 1,
                        modifier: 'quiet',
                        onClick: () => {
                            model.removePendingDim(dim);
                            model.setShowAddSelect(false);
                        }
                    })
                ]
            });
        });

        if (isEmpty(pendingValue) && !showAddSelect) {
            children.push(
                div({
                    className: 'xh-dim-dialog-select-row',
                    items: [filler(), emptyText, filler()]
                })
            );
        }

        const atMaxDepth = (pendingValue.length === Math.min(maxDepth, size(dimensions)));
        if (!atMaxDepth && !leafInPending) {
            children.push(addOrSelectButton({dialogWidth}));
        }

        return children;
    }
);

const addOrSelectButton = hoistCmp.factory(
    ({model, dialogWidth}) => {
        // can update to match dimension chooser add/select logic
        const {pendingValue} = model,
            pendingCount = pendingValue.length,
            marginLeft = LEFT_PAD + (pendingCount * INDENT),
            width = dialogWidth - marginLeft - X_BTN_WIDTH;

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
                modifier: 'quiet',
                onClick: () => model.setShowAddSelect(true)
            });
    }
);