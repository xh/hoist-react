/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {box, div, filler, fragment, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, uses, WithoutModelAndRef} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {elemWithin, getTestId, TEST_ID} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, isEmpty, sortBy} from 'lodash';
import './GroupingChooser.scss';
import {RefAttributes} from 'react';

export interface GroupingChooserProps
    extends WithoutModelAndRef<ButtonProps>,
        HoistProps<GroupingChooserModel, HTMLDivElement>,
        RefAttributes<HTMLDivElement> {
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
            testId,
            ...rest
        },
        ref
    ) {
        const {editorIsOpen, favoritesIsOpen, persistFavorites, value, allowEmpty} = model,
            isOpen = editorIsOpen || favoritesIsOpen,
            label = isEmpty(value) && allowEmpty ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest),
            favoritesMenuTestId = getTestId(testId, 'favorites-menu'),
            favoritesIconTestId = getTestId(testId, 'favorites-icon'),
            editorTestId = getTestId(testId, 'editor');

        return box({
            ref,
            className,
            ...layoutProps,
            item: popover({
                isOpen,
                popoverRef: model.popoverRef,
                popoverClassName: 'xh-grouping-chooser-popover xh-popup--framed',
                // right align favorites popover to match star icon
                // left align editor to keep in place when button changing size when commitOnChange: true
                position: favoritesIsOpen ? `${popoverPosition}-right` : `${popoverPosition}-left`,
                minimal: styleButtonAsInput,
                item: fragment(
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
                        onClick: () => model.toggleEditor(),
                        testId
                    }),
                    favoritesIcon({testId: favoritesIconTestId})
                ),
                content: favoritesIsOpen
                    ? favoritesMenu({testId: favoritesMenuTestId})
                    : editorIsOpen
                      ? editor({
                            popoverWidth,
                            popoverMinHeight,
                            popoverTitle,
                            emptyText,
                            testId: editorTestId
                        })
                      : null,
                onInteraction: (nextOpenState, e) => {
                    if (
                        isOpen &&
                        nextOpenState === false &&
                        e?.target &&
                        !elemWithin(
                            e.target as HTMLElement,
                            'xh-grouping-chooser-button--with-favorites'
                        )
                    ) {
                        model.commitPendingValueAndClose();
                    }
                }
            })
        });
    }
});

//------------------
// Editor
//------------------
const editor = hoistCmp.factory<GroupingChooserModel>({
    render({popoverWidth, popoverMinHeight, popoverTitle, emptyText, testId}) {
        return panel({
            width: popoverWidth,
            minHeight: popoverMinHeight,
            items: [
                div({className: 'xh-popup__title', item: popoverTitle, omit: !popoverTitle}),
                dimensionList({emptyText}),
                addDimensionControl(),
                filler()
            ],
            testId
        });
    }
});

const dimensionList = hoistCmp.factory<GroupingChooserModel>({
    render({model, emptyText}) {
        if (isEmpty(model.pendingValue)) {
            return model.allowEmpty
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
                children: dndProps =>
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

const dimensionRow = hoistCmp.factory<GroupingChooserModel>({
    render({model, dimension, idx}) {
        // The options for this select include its current value
        const options = getDimOptions([...model.availableDims, dimension], model);

        return draggable({
            key: dimension,
            draggableId: dimension,
            index: idx,
            children: (dndProps, dndState) => {
                // Because the popover uses css transforms to position itself,
                // we need to adjust the draggable's transform to account for this.
                //
                // The below workaround is based on approaches discussed on this thread:
                // https://github.com/atlassian/react-beautiful-dnd/issues/128
                let transform = dndProps.draggableProps.style.transform;
                if (dndState.isDragging || dndState.isDropAnimating) {
                    let rowValues = parseTransform(transform),
                        pPos = model.popoverRef.current.getBoundingClientRect(),
                        popoverValues = {
                            x: pPos.left,
                            y: pPos.top
                        };

                    // Account for drop animation
                    if (dndState.isDropAnimating) {
                        const {x, y} = dndState.dropAnimation.moveTo;
                        rowValues = [x, y];
                    }

                    // Subtract the popover's X / Y translation from the row's
                    if (!isEmpty(rowValues)) {
                        const x = rowValues[0] - popoverValues.x,
                            y = rowValues[1] - popoverValues.y;
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

const addDimensionControl = hoistCmp.factory<GroupingChooserModel>({
    render({model}) {
        if (!model.isAddEnabled) return null;
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
function parseTransform(transformStr: string): number[] {
    return transformStr
        ?.replace('3d', '')
        .match(/[-]{0,1}[\d]*[.]{0,1}[\d]+/g)
        ?.map(it => parseInt(it));
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
const favoritesIcon = hoistCmp.factory<GroupingChooserModel>({
    render({model, testId}) {
        if (!model.persistFavorites) return null;
        return div({
            item: Icon.favorite(),
            className: 'xh-grouping-chooser__favorite-icon',
            [TEST_ID]: testId,
            onClick: e => {
                model.toggleFavoritesMenu();
                e.stopPropagation();
            }
        });
    }
});

const favoritesMenu = hoistCmp.factory<GroupingChooserModel>({
    render({model, testId}) {
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
                icon: Icon.add({intent: 'success'}),
                text: 'Add current',
                omit: omitAdd,
                onClick: () => model.addFavorite(model.value)
            })
        );

        return vbox({
            testId,
            items: [div({className: 'xh-popup__title', item: 'Favorites'}), menu({items})]
        });
    }
});

const favoriteMenuItem = hoistCmp.factory<GroupingChooserModel>({
    render({model, value, label}) {
        return menuItem({
            text: label,
            className: 'xh-grouping-chooser__favorite',
            onClick: () => model.setValue(value),
            labelElement: button({
                icon: Icon.delete(),
                intent: 'danger',
                onClick: e => {
                    model.removeFavorite(value);
                    e.stopPropagation();
                }
            })
        });
    }
});
