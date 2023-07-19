/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {GroupingChooserLocalModel} from '@xh/hoist/cmp/grouping/impl/GroupingChooserLocalModel';
import {box, div, filler, fragment, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, useLocalModel, uses} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {MENU_PORTAL_ID, select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty} from 'lodash';
import './GroupingChooser.scss';

export interface GroupingChooserProps extends ButtonProps<GroupingChooserModel> {
    /** Text to represent empty state (i.e. value = null or []) */
    emptyText?: string;

    /** Min height in pixels of the popover menu itself. */
    popoverMinHeight?: number;

    /** Position of popover relative to target button. */
    popoverPosition?: 'bottom' | 'top';

    /** Title for popover (default "GROUP BY") or null to suppress. */
    popoverTitle?: string;

    /** Width in pixels of the popover menu itself. */
    popoverWidth?: number;

    /** True (default) to style target button as an input field - blends better in toolbars. */
    styleButtonAsInput?: boolean;
}

/**
 * Control for selecting a list of dimensions for grouping APIs, with built-in support for
 * drag-and-drop reordering and user-managed favorites.
 *
 * @see GroupingChooserModel
 */
export const [GroupingChooser, groupingChooser] = hoistCmp.withFactory<GroupingChooserProps>({
    model: uses(GroupingChooserModel),
    className: 'xh-grouping-chooser',
    render(
        {
            model,
            className,
            emptyText = 'Ungrouped',
            popoverWidth = 250,
            popoverMinHeight,
            popoverTitle = 'Group By',
            popoverPosition = 'bottom',
            styleButtonAsInput = true,
            ...rest
        },
        ref
    ) {
        const {persistFavorites, value, allowEmpty} = model,
            impl = useLocalModel(() => new GroupingChooserLocalModel(model)),
            {editorIsOpen, favoritesIsOpen} = impl,
            isOpen = editorIsOpen || favoritesIsOpen,
            label = isEmpty(value) && allowEmpty ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest);

        return box({
            ref,
            className,
            ...layoutProps,
            item: popover({
                isOpen,
                popoverRef: impl.popoverRef,
                popoverClassName: 'xh-grouping-chooser-popover xh-popup--framed',
                // right align favorites popover to match star icon
                // left align editor to keep in place when button changing size when commitOnChange: true
                position: favoritesIsOpen ? `${popoverPosition}-right` : `${popoverPosition}-left`,
                minimal: styleButtonAsInput,
                target: fragment(
                    button({
                        text: label,
                        title: label,
                        tabIndex: -1,
                        className: classNames(
                            'xh-grouping-chooser-button',
                            styleButtonAsInput ? 'xh-grouping-chooser-button--as-input' : null,
                            persistFavorites ? 'xh-grouping-chooser-button--with-favorites' : null
                        ),
                        minimal: styleButtonAsInput,
                        ...buttonProps,
                        onClick: () => impl.toggleEditor()
                    }),
                    favoritesIcon({model: impl})
                ),
                content: favoritesIsOpen
                    ? favoritesMenu({model: impl})
                    : editorIsOpen
                    ? editor({popoverWidth, popoverMinHeight, popoverTitle, emptyText})
                    : null,
                onInteraction: (nextOpenState, e) => {
                    if (
                        isOpen &&
                        nextOpenState === false &&
                        e?.target &&
                        !targetIsControlButtonOrPortal(e.target)
                    ) {
                        impl.commitPendingValueAndClose();
                    }
                }
            })
        });
    }
});

//------------------
// Editor
//------------------

interface EditorProps
    extends HoistProps<GroupingChooserLocalModel>,
        Pick<
            GroupingChooserProps,
            'emptyText' | 'popoverMinHeight' | 'popoverWidth' | 'popoverTitle'
        > {}

const editor = hoistCmp.factory<EditorProps>({
    model: uses(GroupingChooserLocalModel),
    render({popoverWidth, popoverMinHeight, popoverTitle, emptyText}) {
        return panel({
            width: popoverWidth,
            minHeight: popoverMinHeight,
            items: [
                div({className: 'xh-popup__title', item: popoverTitle, omit: !popoverTitle}),
                dimensionList({emptyText}),
                addDimensionControl(),
                filler()
            ]
        });
    }
});

interface DimensionListProps
    extends HoistProps<GroupingChooserLocalModel>,
        Pick<GroupingChooserProps, 'emptyText'> {}

const dimensionList = hoistCmp.factory<DimensionListProps>({
    render({model, emptyText}) {
        if (isEmpty(model.pendingValue)) {
            return model.parentModel.allowEmpty
                ? hbox({
                      className: 'xh-grouping-chooser__row',
                      items: [filler(), emptyText, filler()]
                  })
                : null;
        }

        return dragDropContext({
            onDragEnd: result => model.onDragEnd(result),
            item: droppable({
                droppableId: 'dimension-list',
                item: dndProps =>
                    div({
                        ref: dndProps.innerRef,
                        className: 'xh-grouping-chooser__list',
                        items: [
                            ...model.pendingValue.map((dimension, idx) =>
                                dimensionRow({dimension, idx})
                            ),
                            dndProps.placeholder
                        ]
                    })
            })
        });
    }
});

interface DimensionRowProps extends HoistProps<GroupingChooserLocalModel> {
    dimension: string;
    idx: number;
}

const dimensionRow = hoistCmp.factory<DimensionRowProps>({
    render({model, dimension, idx}) {
        // The options for this select include its current value
        const options = model.buildDimOptions([...model.availableDims, dimension]);

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
                            ...dndProps.dragHandleProps,
                            tabIndex: -1
                        }),
                        div({
                            className: 'xh-grouping-chooser__row__select',
                            item: select({
                                options,
                                value: dimension,
                                flex: 1,
                                width: null,
                                hideDropdownIndicator: true,
                                onChange: newDim => model.replacePendingDimAtIdx(newDim, idx)
                            })
                        }),
                        button({
                            icon: Icon.delete(),
                            intent: 'danger',
                            tabIndex: -1,
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

const addDimensionControl = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model}) {
        if (!model.isAddEnabled) return null;
        const options = model.buildDimOptions(model.availableDims);
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
                    hideDropdownIndicator: true,
                    hideSelectedOptionCheck: true,
                    onChange: newDim => model.addPendingDim(newDim)
                })
            ]
        });
    }
});

/**
 * Extract integer values from CSS transform string.
 * Works for both `translate` and `translate3d`
 * e.g. `translate3d(250px, 150px, 0px)` is equivalent to [250, 150, 0]
 */
function parseTransform(transformStr: string) {
    return transformStr
        ?.replace('3d', '')
        .match(/[-]{0,1}[\d]*[.]{0,1}[\d]+/g)
        ?.map(it => parseInt(it));
}

function targetIsControlButtonOrPortal(target: HTMLElement) {
    const selectPortal = document.getElementById(MENU_PORTAL_ID)?.contains(target),
        selectClick = targetWithin(target, 'xh-select__single-value'),
        editorClick = targetWithin(target, 'xh-grouping-chooser-button--with-favorites');
    return selectPortal || selectClick || editorClick;
}

/**
 * Determines whether any of the target's parents have a specific class name
 */
function targetWithin(target: HTMLElement, className: string): boolean {
    for (let elem = target; elem; elem = elem.parentElement) {
        if (elem.classList.contains(className)) return true;
    }
    return false;
}

//------------------
// Favorites
//------------------

const favoritesIcon = hoistCmp.factory({
    model: uses(GroupingChooserLocalModel),
    render({model}) {
        if (!model.parentModel.persistFavorites) return null;
        return div({
            item: Icon.favorite(),
            className: 'xh-grouping-chooser__favorite-icon',
            onClick: e => {
                model.toggleFavoritesMenu();
                e.stopPropagation();
            }
        });
    }
});

const favoritesMenu = hoistCmp.factory({
    model: uses(GroupingChooserLocalModel),
    render({model}) {
        const {parentModel} = model;
        const options = parentModel.favoritesOptions,
            isFavorite = parentModel.isFavorite(parentModel.value),
            omitAdd = isEmpty(parentModel.value) || isFavorite,
            items = [];

        if (isEmpty(options)) {
            items.push(menuItem({text: 'No favorites saved...', disabled: true}));
        } else {
            items.push(...options.map(it => favoriteMenuItem({...it, model})));
        }

        items.push(
            menuDivider({omit: omitAdd}),
            menuItem({
                icon: Icon.add({intent: 'success'}),
                text: 'Add current',
                omit: omitAdd,
                onClick: () => parentModel.addFavorite(parentModel.value)
            })
        );

        return vbox(div({className: 'xh-popup__title', item: 'Favorites'}), menu({items}));
    }
});

interface FavoriteMenuItemProps extends HoistProps<GroupingChooserLocalModel> {
    value: string[];
    label: string;
}

const favoriteMenuItem = hoistCmp.factory<FavoriteMenuItemProps>({
    render({model, value, label}) {
        const {parentModel} = model;
        return menuItem({
            text: label,
            className: 'xh-grouping-chooser__favorite',
            onClick: () => parentModel.setValue(value),
            labelElement: button({
                icon: Icon.delete(),
                intent: 'danger',
                onClick: e => {
                    parentModel.removeFavorite(value);
                    e.stopPropagation();
                }
            })
        });
    }
});
