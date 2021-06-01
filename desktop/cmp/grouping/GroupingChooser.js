/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {box, div, filler, fragment, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button, Button} from '@xh/hoist/desktop/cmp/button';
import {select, Select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar, toolbarSep} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, isEmpty, sortBy} from 'lodash';
import PT from 'prop-types';
import './GroupingChooser.scss';

/**
 * Control for selecting a list of dimensions for grouping APIs, with built-in support for
 * drag-and-drop reordering and user-managed favorites.
 *
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
        popoverMinHeight = 120,
        popoverTitle = 'Group By',
        popoverPosition = 'bottom',
        styleButtonAsInput = true,
        ...rest
    }, ref) {
        const {editorIsOpen, favoritesIsOpen, persistFavorites, value} = model,
            isOpen = editorIsOpen || favoritesIsOpen,
            label = isEmpty(value) ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest);

        return box({
            ref,
            className,
            ...layoutProps,
            item: popover({
                isOpen,
                popoverRef: (v) => model.popoverRef(v), // Workaround for #2272
                popoverClassName: classNames('xh-grouping-chooser-popover', editorIsOpen ? 'xh-popup--framed' : null),
                position: favoritesIsOpen ? 'bottom-right' : popoverPosition,
                minimal: favoritesIsOpen,
                target: fragment(
                    button({
                        text: label,
                        title: label,
                        className: classNames(
                            'xh-grouping-chooser-button',
                            styleButtonAsInput ? 'xh-grouping-chooser-button--as-input' : null,
                            persistFavorites ? 'xh-grouping-chooser-button--with-favorites' : null
                        ),
                        minimal: styleButtonAsInput,
                        ...buttonProps,
                        onClick: () => model.showEditor()
                    }),
                    favoritesIcon()
                ),
                content: favoritesIsOpen ? favoritesMenu() : editor({popoverWidth, popoverMinHeight, popoverTitle, emptyText}),
                onInteraction: (nextOpenState, e) => {
                    if (isOpen && nextOpenState === false) {
                        // Prevent clicks with Select controls from closing popover
                        const selectPortal = document.getElementById(Select.MENU_PORTAL_ID)?.contains(e?.target),
                            selectClick = e?.target?.classList.contains('xh-select__single-value');

                        if (!selectPortal && !selectClick) {
                            model.commitPendingValueAndClose();
                        }
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

    /** Min height in pixels of the popover menu itself. */
    popoverMinHeight: PT.number,

    /** Position for chooser popover, as per Blueprint docs. */
    popoverPosition: PT.oneOf([
        'top-left', 'top', 'top-right',
        'right-top', 'right', 'right-bottom',
        'bottom-right', 'bottom', 'bottom-left',
        'left-bottom', 'left', 'left-top',
        'auto'
    ]),

    /** Title for popover (default "GROUP BY") or null to suppress. */
    popoverTitle: PT.string,

    /** Width in pixels of the popover menu itself. */
    popoverWidth: PT.number,

    /** True (default) to style target button as an input field - blends better in toolbars. */
    styleButtonAsInput: PT.bool
};

//------------------
// Editor
//------------------
const editor = hoistCmp.factory({
    render({model, popoverWidth, popoverMinHeight, popoverTitle, emptyText}) {
        return panel({
            width: popoverWidth,
            minHeight: popoverMinHeight,
            items: [
                div({className: 'xh-popup__title', item: popoverTitle}),
                dimensionList({emptyText}),
                addDimensionControl({omit: !model.addControlShown}),
                filler()
            ],
            bbar: bbar()
        });
    }
});

const dimensionList = hoistCmp.factory({
    render({model, emptyText}) {
        if (!model.addControlShown && isEmpty(model.pendingValue)) {
            return hbox({
                className: 'xh-grouping-chooser__row',
                items: [filler(), emptyText, filler()]
            });
        }

        return dragDropContext({
            onDragEnd: (result) => model.onDragEnd(result),
            item: droppable({
                droppableId: 'dimension-list',
                item: (dndProps) => div({
                    ref: dndProps.innerRef,
                    className: 'xh-grouping-chooser__list',
                    items: [
                        ...model.pendingValue.map((dimension, idx) => dimensionRow({dimension, idx})),
                        dndProps.placeholder
                    ]
                })
            })
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
                                disabled: options.length <= 1,
                                onChange: (newDim) => model.replacePendingDimAtIdx(newDim, idx)
                            })
                        }),
                        button({
                            icon: Icon.delete(),
                            intent: 'danger',
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
                    placeholder: 'Add...',
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
        const {isAddMode, addDisabledMsg, isValid} = model;

        return toolbar({
            className: 'xh-grouping-chooser__btn-row',
            items: [
                button({
                    icon: Icon.add(),
                    text: 'Add',
                    intent: 'success',
                    omit: isAddMode,
                    disabled: !!addDisabledMsg,
                    title: addDisabledMsg,
                    onClick: () => model.addLevel()
                }),
                filler(),
                button({
                    icon: Icon.close(),
                    title: 'Cancel',
                    intent: 'danger',
                    onClick: () => model.closePopover()
                }),
                toolbarSep(),
                button({
                    icon: Icon.check(),
                    text: 'Apply',
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
        return div({
            item: Icon.favorite(),
            className: 'xh-grouping-chooser__favorite-icon',
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
            omitAdd = isEmpty(model.value) || isFavorite,
            items = [];

        if (isEmpty(options)) {
            items.push(menuItem({text: 'No favorites saved...', disabled: true}));
        } else {
            items.push(...options.map(it => favoriteMenuItem(it)));
        }

        items.push(
            menuDivider({omit: omitAdd}),
            menuItem({
                icon: Icon.add({className: 'xh-intent-success'}),
                text: 'Add current',
                omit: omitAdd,
                onClick: () => model.addFavorite(model.value)
            })
        );

        return vbox(
            div({className: 'xh-popup__title', item: 'Favorites'}),
            menu({items})
        );
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
