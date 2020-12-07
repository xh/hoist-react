/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */

import {hoistCmp, uses} from '@xh/hoist/core';
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {div, fragment, vbox, hbox, filler, box} from '@xh/hoist/cmp/layout';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {select, Select} from '@xh/hoist/desktop/cmp/input';
import {Icon} from '@xh/hoist/icon';
import {popover, menu, menuDivider, menuItem} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {compact, isEmpty, isNil, sortBy} from 'lodash';
import classNames from 'classnames';
import PT from 'prop-types';

import './GroupingChooser.scss';

/**
 * Control for selecting a list of dimensions for grouping APIs.
 * @see GroupingChooserModel
 */
export const [GroupingChooser, groupingChooser] = hoistCmp.withFactory({
    model: uses(GroupingChooserModel),
    className: 'xh-grouping-chooser',
    render({
        model,
        className,
        emptyText = 'Ungrouped',
        popoverWidth = 250,
        popoverTitle = 'Group By',
        popoverPosition = 'bottom',
        styleButtonAsInput = true,
        ...rest
    }) {
        const {editorIsOpen, favoritesIsOpen, value} = model,
            isOpen = editorIsOpen || favoritesIsOpen,
            label = isEmpty(value) ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest);

        if (isNil(layoutProps.width) && isNil(layoutProps.flex)) {
            layoutProps.width = 220;
        }

        return box({
            className,
            ...layoutProps,
            item: popover({
                isOpen,
                popoverRef: model.popoverRef,
                popoverClassName: classNames('xh-grouping-chooser-popover', editorIsOpen ? 'xh-popup--framed' : null),
                position: favoritesIsOpen ? 'bottom-right' : popoverPosition,
                minimal: favoritesIsOpen,
                target: fragment(
                    button({
                        text: label,
                        title: label,
                        className: classNames('xh-grouping-chooser-button', styleButtonAsInput ? 'xh-grouping-chooser-button--as-input' : null),
                        minimal: styleButtonAsInput,
                        ...buttonProps,
                        onClick: () => model.showEditor()
                    }),
                    favoritesIcon()
                ),
                content: favoritesIsOpen ? favoritesMenu() : editor({popoverWidth, popoverTitle}),
                onInteraction: (nextOpenState, e) => {
                    if (nextOpenState === false) {
                        // Prevent clicks with Select controls from closing popover
                        const selectPortal = document.getElementById(Select.MENU_PORTAL_ID)?.contains(e?.target),
                            selectClick = e?.target?.classList.contains('xh-select__single-value');
                        if (!selectPortal && !selectClick) model.closePopover();
                    }
                }
            })
        });
    }
});

GroupingChooser.propTypes = {
    ...Button.propTypes,

    /** Text to represent empty state (i.e. value = null or []) */
    emptyText: PT.string,

    /** Primary component model instance. */
    model: PT.instanceOf(GroupingChooserModel),

    /** Title for popover (default "GROUP BY") or null to suppress. */
    popoverTitle: PT.string,

    /** Width in pixels of the popover menu itself. */
    popoverWidth: PT.number,

    /** Position for chooser popover, as per Blueprint docs. */
    popoverPosition: PT.oneOf([
        'top-left', 'top', 'top-right',
        'right-top', 'right', 'right-bottom',
        'bottom-right', 'bottom', 'bottom-left',
        'left-bottom', 'left', 'left-top',
        'auto'
    ]),

    /** True (default) to style target button as an input field - blends better in toolbars. */
    styleButtonAsInput: PT.bool
};

//------------------
// Editor
//------------------
const editor = hoistCmp.factory({
    render({model, popoverWidth, popoverTitle}) {
        return vbox({
            width: popoverWidth,
            items: [
                div({
                    className: 'xh-popup__title',
                    item: popoverTitle
                }),
                dragDropContext({
                    onDragEnd: (result) => model.onDragEnd(result),
                    item: droppable({
                        droppableId: 'dimension-list',
                        item: (dndProps) => dimensionList({
                            ref: dndProps.innerRef,
                            placeholder: dndProps.placeholder
                        })
                    })
                }),
                addDimensionControl(),
                bbar()
            ]
        });
    }
});

const dimensionList = hoistCmp.factory({
    render({model, placeholder}, ref) {
        return div({
            ref,
            className: 'xh-grouping-chooser__list',
            items: [
                ...model.pendingValue.map((dimension, idx) => {
                    return dimensionRow({dimension, idx});
                }),
                placeholder
            ]
        });
    }
});

const dimensionRow = hoistCmp.factory({
    render({model, dimension, idx}) {
        // The options for this select include its current value
        const options = getDimOptions([...model.availableDims, dimension], model);

        return draggable({
            key: dimension,
            draggableId: dimension,
            index: idx,
            item: (dndProps, dndState) => {
                // Because the popover uses css transforms to position itself,
                // we need to adjust the draggable's transform to account for this.
                //
                // The below workaround is based on approaches discussed on this thread:
                // https://github.com/atlassian/react-beautiful-dnd/issues/128
                let transform = dndProps.draggableProps.style.transform;
                if (dndState.isDragging || dndState.isDropAnimating) {
                    let rowValues = parseTransform(transform),
                        popoverValues = parseTransform(model.popoverRef.current.style.transform);

                    // Account for drop animation
                    if (dndState.isDropAnimating) {
                        const {x, y} = dndState.dropAnimation.moveTo;
                        rowValues = [x, y];
                    }

                    // Subtract the popover's X / Y translation from the row's
                    if (!isEmpty(rowValues) && !isEmpty(popoverValues)) {
                        const x = rowValues[0] - popoverValues[0],
                            y = rowValues[1] - popoverValues[1];
                        transform = `translate(${x}px, ${y}px)`;
                    }
                }

                return div({
                    key: dimension,
                    className: classNames(
                        'xh-grouping-chooser__row',
                        dndState.isDragging ? 'xh-grouping-chooser__row--dragging' : null
                    ),
                    items: [
                        div({
                            className: 'xh-grouping-chooser__row__grabber',
                            item: Icon.grip({prefix: 'fal'}),
                            ...dndProps.dragHandleProps
                        }),
                        div({
                            className: 'xh-grouping-chooser__row__select',
                            item: select({
                                options,
                                value: dimension,
                                flex: 1,
                                width: null,
                                hideDropdownIndicator: true,
                                disabled: isEmpty(options),
                                onChange: (newDim) => model.replacePendingDimAtIdx(newDim, idx)
                            })
                        }),
                        button({
                            icon: Icon.delete(),
                            className: 'xh-grouping-chooser__row__remove-btn',
                            onClick: () => model.removePendingDimAtIdx(idx)
                        })
                    ],
                    ref: dndProps.innerRef,
                    ...dndProps.draggableProps,
                    style: {
                        ...dndProps.draggableProps.style,
                        transform
                    }
                });
            }
        });
    }
});

const addDimensionControl = hoistCmp.factory({
    render({model}) {
        if (!model.showAddControl || model.addDisabledMsg) return null;
        const options = getDimOptions(model.availableDims, model);
        return div({
            className: 'xh-grouping-chooser__add-control',
            items: [
                div({
                    className: 'xh-grouping-chooser__add-control__icon',
                    item: Icon.grip({prefix: 'fal'})
                }),
                select({
                    // By changing the key each time the options change, we can
                    // ensure the Select loses its internal input state.
                    key: JSON.stringify(options),
                    options,
                    placeholder: 'Add Dimension...',
                    flex: 1,
                    width: null,
                    autoFocus: true,
                    openMenuOnFocus: true,
                    hideDropdownIndicator: true,
                    hideSelectedOptionCheck: true,
                    onChange: (newDim) => model.addPendingDim(newDim)
                })
            ]
        });
    }
});

const bbar = hoistCmp.factory({
    render({model}) {
        const {addDisabledMsg, isValid} = model,
            addDisabled = !!addDisabledMsg;

        return hbox({
            className: 'xh-grouping-chooser__btn-row',
            items: [
                button({
                    icon: Icon.add(),
                    intent: 'success',
                    disabled: !!addDisabled,
                    title: addDisabledMsg,
                    onClick: () => model.toggleAddControl()
                }),
                filler(),
                button({
                    icon: Icon.close(),
                    onClick: () => model.closePopover()
                }),
                button({
                    icon: Icon.check(),
                    intent: 'success',
                    disabled: !isValid,
                    onClick: () => model.commitPendingValueAndClose()
                })
            ]
        });
    }
});

/**
 * Extract integer values from CSS transform string.
 * Works for both `translate` and `translate3d`
 * e.g. `translate3d(250px, 150px, 0px)` => [250, 150, 0]
 */
function parseTransform(transformStr) {
    return transformStr?.
        replace('3d', '').
        match(/[-]{0,1}[\d]*[.]{0,1}[\d]+/g)?.
        map(it => parseInt(it));
}

/**
 * Convert a list of dim names into select options
 */
function getDimOptions(dims, model) {
    const ret = compact(dims).map(dimName => {
        return {value: dimName, label: model.getDimDisplayName(dimName)};
    });
    return sortBy(ret, 'label');
}

//------------------
// Favorites
//------------------
const favoritesIcon = hoistCmp.factory({
    render({model}) {
        if (!model.persistFavorites) return null;
        const isFavorite = model.isFavorite(model.value);
        return div({
            item: Icon.favorite({prefix: isFavorite ? 'fas' : 'far'}),
            className: classNames(
                'xh-grouping-chooser__favorite-icon',
                isFavorite ? 'xh-grouping-chooser__favorite-icon--active' : null
            ),
            onClick: (e) => {
                model.openFavoritesMenu();
                e.stopPropagation();
            }
        });
    }
});

const favoritesMenu = hoistCmp.factory({
    render({model}) {
        const options = model.favoritesOptions,
            isFavorite = model.isFavorite(model.value),
            addDisabled = isEmpty(model.value) || isFavorite,
            items = [];

        if (isEmpty(options)) {
            items.push(menuItem({text: 'You have not yet saved any favorites...', disabled: true}));
        } else {
            items.push(...options.map(it => favoriteMenuItem(it)));
        }

        items.push(
            menuDivider(),
            menuItem({
                icon: Icon.add({className: addDisabled ? '' : 'xh-intent-success'}),
                text: 'Add current grouping to favorites',
                disabled: addDisabled,
                onClick: () => model.addFavorite(model.value)
            })
        );

        return menu({items});
    }
});

const favoriteMenuItem = hoistCmp.factory({
    render({model, value, label}) {
        return menuItem({
            text: label,
            className: 'xh-grouping-chooser__favorite',
            onClick: () => model.setValue(value),
            labelElement: button({
                icon: Icon.delete(),
                intent: 'danger',
                onClick: (e) => {
                    model.removeFavorite(value);
                    e.stopPropagation();
                }
            })
        });
    }
});
