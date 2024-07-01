/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {box, div, filler, hbox, placeholder, span, vbox, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {select} from '@xh/hoist/mobile/cmp/input';
import '@xh/hoist/mobile/register';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, isEmpty, sortBy} from 'lodash';

import './GroupingChooser.scss';

export interface GroupingChooserProps extends ButtonProps<GroupingChooserModel> {
    /** Text to represent empty state (i.e. value = null or [])*/
    emptyText?: string;
    /** Title for popover (default "GROUP BY") or null to suppress. */
    popoverTitle?: string;
    /** Min height in pixels of the popover inner content (excl. header & toolbar). */
    popoverMinHeight?: number;
    /** Width in pixels of the popover menu itself. */
    popoverWidth?: number;
}

/**
 * Control for selecting a list of dimensions for grouping APIs.
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
            popoverWidth = 270,
            popoverMinHeight,
            popoverTitle = 'Group By',
            ...rest
        },
        ref
    ) {
        const {value, allowEmpty} = model,
            label = isEmpty(value) && allowEmpty ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest);

        return box({
            ref,
            className,
            ...layoutProps,
            items: [
                popoverCmp({popoverTitle, popoverWidth, popoverMinHeight, emptyText}),
                button({
                    className: 'xh-grouping-chooser-button',
                    item: span(label),
                    ...buttonProps,
                    onClick: () => model.toggleEditor()
                }),
                favoritesButton()
            ]
        });
    }
});

//---------------------------
// Popover
//---------------------------
const popoverCmp = hoistCmp.factory<GroupingChooserModel>(
    ({model, popoverTitle, popoverWidth, popoverMinHeight, emptyText}) => {
        const {editorIsOpen, favoritesIsOpen, isValid, value} = model,
            isOpen = editorIsOpen || favoritesIsOpen,
            addFavoriteDisabled = isEmpty(value) || !!model.isFavorite(value);

        return dialog({
            isOpen,
            title: favoritesIsOpen ? 'Favorites' : popoverTitle,
            icon: favoritesIsOpen ? Icon.favorite({prefix: 'fas'}) : Icon.treeList(),
            className: 'xh-grouping-chooser-popover',
            content: vframe({
                className: 'xh-grouping-chooser-popover__content',
                width: popoverWidth,
                minHeight: popoverMinHeight,
                item: favoritesIsOpen ? favoritesMenu() : editor({emptyText})
            }),
            onCancel: () => model.closePopover(),
            buttons: favoritesIsOpen
                ? [
                      button({
                          icon: Icon.add(),
                          flex: 1,
                          text: 'Add current',
                          disabled: addFavoriteDisabled,
                          onClick: () => model.addFavorite(model.value)
                      })
                  ]
                : [
                      filler(),
                      button({
                          text: 'Cancel',
                          minimal: true,
                          onClick: () => model.closePopover()
                      }),
                      button({
                          icon: Icon.check(),
                          text: 'Apply',
                          disabled: !isValid,
                          onClick: () => model.commitPendingValueAndClose()
                      })
                  ]
        });
    }
);

//------------------
// Editor
//------------------
const editor = hoistCmp.factory({
    render({emptyText}) {
        return vbox(dimensionList({emptyText}), addDimensionControl());
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
                                onChange: newDim => model.replacePendingDimAtIdx(newDim, idx)
                            })
                        }),
                        button({
                            icon: Icon.delete(),
                            className: 'xh-grouping-chooser__row__remove-btn',
                            minimal: true,
                            onClick: () => model.removePendingDimAtIdx(idx)
                        })
                    ],
                    ref: dndProps.innerRef,
                    ...dndProps.draggableProps
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
const favoritesButton = hoistCmp.factory<GroupingChooserModel>({
    render({model}) {
        if (!model.persistFavorites) return null;
        return button({
            icon: Icon.favorite(),
            minimal: true,
            className: 'xh-grouping-chooser__favorite-button',
            onClick: () => model.toggleFavoritesMenu()
        });
    }
});

const favoritesMenu = hoistCmp.factory<GroupingChooserModel>({
    render({model}) {
        const options = model.favoritesOptions;

        if (isEmpty(options)) {
            return placeholder('No favorites saved...');
        }

        const items = options.map(it => favoriteMenuItem(it));
        return div({items});
    }
});

const favoriteMenuItem = hoistCmp.factory<GroupingChooserModel>({
    render({model, value, label}) {
        return hbox({
            className: 'xh-grouping-chooser__favorite',
            items: [
                button({
                    text: label,
                    minimal: true,
                    flex: 1,
                    onClick: () => {
                        model.setValue(value);
                        model.closePopover();
                    }
                }),
                button({
                    icon: Icon.delete(),
                    minimal: true,
                    onClick: () => model.removeFavorite(value)
                })
            ]
        });
    }
});
