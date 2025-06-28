/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {box, div, filler, fragment, hbox, hframe, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {elemWithin, getTestId} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, isEmpty, sortBy} from 'lodash';
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

    /**
     * Width in pixels of the popover menu itself.
     * If unspecified, will default based on whether favorites are enabled.
     */
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
    displayName: 'GroupingChooser',
    model: uses(GroupingChooserModel),
    className: 'xh-grouping-chooser',

    render(
        {
            model,
            className,
            emptyText = 'Ungrouped',
            popoverWidth,
            popoverMinHeight,
            popoverTitle = 'Group By',
            popoverPosition = 'bottom',
            styleButtonAsInput = true,
            testId,
            ...rest
        },
        ref
    ) {
        const {editorIsOpen, value, allowEmpty, persistFavorites} = model,
            isOpen = editorIsOpen,
            label = isEmpty(value) && allowEmpty ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest);

        popoverWidth = popoverWidth || (persistFavorites ? 500 : 250);

        return box({
            ref,
            className,
            ...layoutProps,
            item: popover({
                isOpen,
                popoverRef: model.popoverRef,
                popoverClassName: 'xh-grouping-chooser-popover xh-popup--framed',
                // Left align editor to keep in place when button changing size when commitOnChange: true
                position: `${popoverPosition}-left`,
                minimal: false,
                item: fragment(
                    button({
                        text: label,
                        title: label,
                        tabIndex: -1,
                        className: classNames(
                            'xh-grouping-chooser-button',
                            styleButtonAsInput ? 'xh-grouping-chooser-button--as-input' : null
                        ),
                        minimal: styleButtonAsInput,
                        ...buttonProps,
                        onClick: () => model.toggleEditor(),
                        testId
                    })
                ),
                content: popoverCmp({
                    popoverWidth,
                    popoverMinHeight,
                    popoverTitle,
                    emptyText,
                    testId
                }),
                onInteraction: (nextOpenState, e) => {
                    if (
                        isOpen &&
                        nextOpenState === false &&
                        e?.target &&
                        !elemWithin(e.target as HTMLElement, 'xh-grouping-chooser-button')
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
const popoverCmp = hoistCmp.factory<GroupingChooserModel>({
    render({model, popoverWidth, popoverMinHeight, popoverTitle, emptyText, testId}) {
        return panel({
            width: popoverWidth,
            minHeight: popoverMinHeight,
            items: hframe({
                items: [
                    editor({
                        popoverTitle,
                        emptyText,
                        testId: getTestId(testId, 'editor')
                    }),
                    favoritesChooser({
                        omit: !model.persistFavorites,
                        testId: getTestId(testId, 'favorites')
                    })
                ]
            })
        });
    }
});

const editor = hoistCmp.factory<GroupingChooserModel>({
    render({popoverTitle, emptyText, testId}) {
        return vbox({
            className: 'xh-grouping-chooser__editor',
            testId,
            items: [
                div({className: 'xh-popup__title', item: popoverTitle, omit: !popoverTitle}),
                dimensionList({emptyText}),
                addDimensionControl()
            ]
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
                    placeholder: 'Add level...',
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
const favoritesChooser = hoistCmp.factory<GroupingChooserModel>({
    render({model, testId}) {
        const {favoritesOptions: options, isAddFavoriteEnabled} = model,
            items = isEmpty(options)
                ? [menuItem({text: 'No favorites saved.', disabled: true})]
                : options.map(it => favoriteMenuItem(it));

        return vbox({
            className: 'xh-grouping-chooser__favorites',
            testId,
            items: [
                div({className: 'xh-popup__title', item: 'Favorites'}),
                menu({items}),
                button({
                    text: 'Add current',
                    icon: Icon.add({intent: 'success'}),
                    className: 'xh-grouping-chooser__favorites__add-btn',
                    outlined: true,
                    omit: !isAddFavoriteEnabled,
                    onClick: () => model.addPendingAsFavorite()
                })
            ]
        });
    }
});

const favoriteMenuItem = hoistCmp.factory<GroupingChooserModel>({
    render({model, value, label}) {
        return menuItem({
            text: label,
            className: 'xh-grouping-chooser__favorites__favorite',
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
