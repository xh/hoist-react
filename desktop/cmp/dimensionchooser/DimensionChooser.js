/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2019 Extremely Heavy Industries Inc.
 */
import PT from 'prop-types';
import {hoistCmp, uses} from '@xh/hoist/core';
import {vbox, hbox} from '@xh/hoist/cmp/layout/index';
import {button, buttonGroup} from '@xh/hoist/desktop/cmp/button';
import {popover} from '@xh/hoist/kit/blueprint';
import {Icon} from '@xh/hoist/icon';
import {div} from '@xh/hoist/cmp/layout';
import {select, Select} from '@xh/hoist/desktop/cmp/input';
import {defaults, size, isEmpty} from 'lodash';

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
        className,
        buttonIcon,
        buttonText,
        buttonTitle,
        buttonWidth = 220,
        buttonValueTextPrefix,
        styleButtonAsInput = true,
        emptyText = 'Ungrouped',
        popoverWidth = 250,
        popoverTitle = 'Group By',
        selectProps
    }) {
        const {isMenuOpen, activeMode, value, dimensions} = model;
        const getCurrDimensionLabels = () => value.map(it => dimensions[it].label),
            getButtonText = () => {
                const staticText = buttonText;
                if (staticText != undefined) return staticText;
                if (isEmpty(model.value)) return emptyText;

                const prefix = buttonValueTextPrefix,
                    dimText = getCurrDimensionLabels().join(' › ');

                return prefix ? `${prefix} ${dimText}` : dimText;
            },
            getButtonTitle = () => {
                const staticTitle = buttonTitle;
                if (staticTitle != undefined) return staticTitle;
                if (isEmpty(model.value)) return emptyText;

                const labels = getCurrDimensionLabels();
                return labels.map((it, i) => ' '.repeat(i) + (i ? '› ' : '') + it).join('\n');
            };

        const target = button({
            item: getButtonText(),
            title: getButtonTitle(),
            icon: buttonIcon,
            width: buttonWidth,
            className: styleButtonAsInput ? 'xh-dim-button xh-dim-button--as-input' : 'xh-dim-button',
            minimal: styleButtonAsInput,
            onClick: () => model.showMenu()
        });

        const contentCmp = (activeMode === 'history' ? historyMenu : editMenu);

        return div({
            className,
            item: popover({
                target,
                isOpen: isMenuOpen,
                targetClassName: 'xh-dim-popover',
                popoverClassName: 'xh-dim-chooser-popover xh-popup--framed',
                position: 'bottom',
                content: contentCmp({popoverWidth, popoverTitle, selectProps, emptyText}),
                // Handle user clicks outside of the popover (which would by default close it).
                onInteraction: (nextOpenState, e) => {
                    if (nextOpenState === false) {
                        if (model.activeMode === 'edit') {
                            // If editing, save then close. Unless dropdown menu option was clicked - then don't do anything.
                            const selectOptClick = e && e.target && e.target.closest(`#${Select.MENU_PORTAL_ID}`);
                            if (!selectOptClick) model.commitPendingValueAndClose();
                        } else {
                            // ...otherwise just close.
                            model.closeMenu();
                        }
                    }
                }
            })
        });
    }
});

DimensionChooser.propTypes = {
    /** Icon for target button. */
    buttonIcon: PT.element,

    /** Static text for target button, or null (default) to display current dimensions. */
    buttonText: PT.node,

    /**
     * Prefix for button text - applied when value not-empty and static text not specified.
     *      E.g. "Group by" to render "Group by Fund > Trader".
     */
    buttonValueTextPrefix: PT.node,

    /** Width in pixels of the target button. */
    buttonWidth: PT.number,

    /** Text to represent empty state (i.e. value = null or []) */
    emptyText: PT.string,

    /** Primary component model instance. */
    model: PT.instanceOf(DimensionChooserModel),

    /** Title for popover (default "GROUP BY") or null to suppress. */
    popoverTitle: PT.string,

    /** Width in pixels of the popover menu itself. */
    popoverWidth: PT.number,

    /**
     * Additional props passed directly to editor Select components. Use with care - not all
     * props are supported and can easily conflict with this component's usage. Defaulted
     * props for override include `menuPosition` and
     */
    selectProps: PT.object,

    /** True (default) to style target button as an input field - blends better in toolbars. */
    styleButtonAsInput: PT.bool
};


//---------------------------
// sub components
//---------------------------
const historyMenu = hoistCmp.factory(
    ({model, popoverWidth, popoverTitle, emptyText}) => vbox({
        width: popoverWidth,
        className: 'xh-dim-history-popover',
        items: [
            titleBar({popoverWidth, popoverTitle}),
            historyItems({emptyText}),
            buttonGroup({
                className: 'xh-dim-nav-row',
                minimal: true,
                items: [
                    button({
                        icon: Icon.x(),
                        flex: 1,
                        onClick: () => model.closeMenu()
                    }),
                    button({
                        icon: Icon.edit(),
                        flex: 2,
                        title: 'Add a new grouping',
                        onClick: () => model.showEditor()
                    })
                ]
            })
        ]
    })
);

const editMenu = hoistCmp.factory(
    ({model, popoverWidth, popoverTitle, selectProps, emptyText}) => vbox({
        width: popoverWidth,
        className: 'xh-dim-add-popover',
        items: [
            titleBar({popoverWidth, popoverTitle}),
            selectEditors({popoverWidth, selectProps, emptyText}),
            buttonGroup({
                className: 'xh-dim-nav-row',
                items: [
                    button({
                        icon: Icon.arrowLeft(),
                        flex: 1,
                        omit: isEmpty(model.history),
                        onClick: () => model.showHistory()
                    }),
                    button({
                        icon: Icon.check({className: 'xh-green'}),
                        flex: 2,
                        onClick: () => model.commitPendingValueAndClose()
                    })
                ]
            })
        ]
    })
);


const selectEditors = hoistCmp.factory(
    ({model, popoverWidth, selectProps, emptyText}) => {
        const {pendingValue, dimensions, maxDepth, leafInPending, enableClear, showAddSelect} = model;

        selectProps = defaults(selectProps || {}, {
            enableFilter: false,
            menuPlacement: 'auto'
        });

        let children = pendingValue.map((dim, i) => {
            const options = model.dimOptionsForLevel(i, dim),
                marginLeft = LEFT_PAD + (INDENT * i),
                width = popoverWidth - marginLeft - X_BTN_WIDTH;

            return hbox({
                className: 'xh-dim-popover-row',
                items: [
                    select({
                        options,
                        value: dim,
                        disabled: isEmpty(options),
                        width,
                        marginLeft,
                        ...selectProps,
                        onChange: (newDim) => model.addPendingDim(newDim, i)
                    }),
                    button({
                        icon: Icon.x({className: 'xh-red'}),
                        maxWidth: X_BTN_WIDTH,
                        minWidth: X_BTN_WIDTH,
                        disabled: !enableClear && pendingValue.length === 1,
                        onClick: () => model.removePendingDim(dim)
                    })
                ]
            });
        });

        // Empty state - when add button shown, insert emptyText above button.
        if (isEmpty(pendingValue) && !showAddSelect) {
            children.push(
                div({
                    className: 'xh-dim-popover-row--empty',
                    item: emptyText
                })
            );
        }

        const atMaxDepth = (pendingValue.length === Math.min(maxDepth, size(dimensions)));
        if (!atMaxDepth && !leafInPending) {
            children.push(addButtonOrSelect({popoverWidth, selectProps}));
        }

        // Empty state - when select shown, insert placeholder below to avoid layout shifting.
        if (isEmpty(pendingValue) && showAddSelect) {
            children.push(
                div({className: 'xh-dim-popover-row--empty'})
            );
        }

        return vbox({
            className: 'xh-dim-popover-selects',
            items: children
        });
    }
);

const addButtonOrSelect = hoistCmp.factory(
    ({model, popoverWidth, selectProps}) => {
        const {pendingValue} = model,
            pendingCount = pendingValue.length,
            marginLeft = LEFT_PAD + (pendingCount * INDENT),
            width = popoverWidth - marginLeft - X_BTN_WIDTH;

        return model.showAddSelect ?
            select({
                options: model.dimOptionsForLevel(pendingCount),
                autoFocus: true,
                openMenuOnFocus: true,
                width,
                marginLeft,
                ...selectProps,
                onChange: (newDim) => model.addPendingDim(newDim, pendingCount)
            }) :
            button({
                text: 'Add grouping...',
                icon: Icon.add({className: 'xh-green'}),
                width,
                marginLeft,
                onClick: () => model.setShowAddSelect(true)
            });
    }
);

const historyItems = hoistCmp.factory(
    ({model, emptyText}) => {
        const {history, dimensions} = model;
        return buttonGroup({
            className: 'xh-dim-history-items',
            vertical: true,
            items: [
                history.map((value, i) => {
                    const labels = isEmpty(value) ? [emptyText] : value.map(h => dimensions[h].label);
                    return button({
                        minimal: true,
                        title: ` ${labels.map((it, i) => ' '.repeat(i) + '\u203a '.repeat(i ? 1 : 0) + it).join('\n')}`,
                        text: labels.join(' \u203a '),
                        key: `dim-history-${i}`,
                        onClick: () => {
                            model.setValue(value);
                            model.closeMenu();
                        }
                    });
                })
            ]
        });
    }
);

const titleBar = hoistCmp.factory(
    ({popoverTitle, popoverWidth}) => {
        if (!popoverTitle) return null;

        return div({
            className: 'xh-popup__title',
            item: popoverTitle
        });
    }
);