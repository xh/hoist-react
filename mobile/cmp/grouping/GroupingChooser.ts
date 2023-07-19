/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {GroupingChooserLocalModel} from '@xh/hoist/cmp/grouping/impl/GroupingChooserLocalModel';
import {box, div, filler, hbox, placeholder, span, vbox, vframe} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistProps, useLocalModel, uses} from '@xh/hoist/core';
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
        const impl = useLocalModel(() => new GroupingChooserLocalModel(model)),
            {value, allowEmpty} = model,
            label = isEmpty(value) && allowEmpty ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest);

        return box({
            ref,
            className,
            ...layoutProps,
            items: [
                popoverCmp({popoverTitle, popoverWidth, popoverMinHeight, emptyText, impl}),
                button({
                    className: 'xh-grouping-chooser-button',
                    item: span(label),
                    ...buttonProps,
                    onClick: () => impl.toggleEditor()
                }),
                favoritesButton()
            ]
        });
    }
});

interface WithLocalModelProps extends HoistProps<GroupingChooserModel> {
    impl: GroupingChooserLocalModel;
}

//---------------------------
// Popover
//---------------------------

interface PopoverProps
    extends WithLocalModelProps,
        Pick<
            GroupingChooserProps,
            'emptyText' | 'popoverMinHeight' | 'popoverWidth' | 'popoverTitle'
        > {
    impl: GroupingChooserLocalModel;
}

const popoverCmp = hoistCmp.factory<PopoverProps>(
    ({model, popoverTitle, popoverWidth, popoverMinHeight, emptyText, impl}) => {
        const {value} = model,
            {editorIsOpen, favoritesIsOpen, isValid} = impl,
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
                item: favoritesIsOpen ? favoritesMenu({impl}) : editor({emptyText, impl})
            }),
            onCancel: () => impl.closePopover(),
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
                          onClick: () => impl.closePopover()
                      }),
                      button({
                          icon: Icon.check(),
                          text: 'Apply',
                          disabled: !isValid,
                          onClick: () => impl.commitPendingValueAndClose()
                      })
                  ]
        });
    }
);

//------------------
// Editor
//------------------

interface WithEmptyTextProps extends WithLocalModelProps {
    emptyText: string;
}

const editor = hoistCmp.factory<WithEmptyTextProps>({
    render({impl, emptyText}) {
        return vbox(dimensionList({impl, emptyText}), addDimensionControl({impl}));
    }
});

const dimensionList = hoistCmp.factory<WithEmptyTextProps>({
    render({model, emptyText, impl}) {
        if (isEmpty(impl.pendingValue)) {
            return model.allowEmpty
                ? hbox({
                      className: 'xh-grouping-chooser__row',
                      items: [filler(), emptyText, filler()]
                  })
                : null;
        }

        return dragDropContext({
            onDragEnd: result => impl.onDragEnd(result),
            item: droppable({
                droppableId: 'dimension-list',
                item: dndProps =>
                    div({
                        ref: dndProps.innerRef,
                        className: 'xh-grouping-chooser__list',
                        items: [
                            ...impl.pendingValue.map((dimension, idx) =>
                                dimensionRow({dimension, idx, impl})
                            ),
                            dndProps.placeholder
                        ]
                    })
            })
        });
    }
});

interface DimensionRowProps extends WithLocalModelProps {
    dimension: string;
    idx: number;
}

const dimensionRow = hoistCmp.factory<DimensionRowProps>({
    render({model, dimension, idx, impl}) {
        // The options for this select include its current value
        const options = getDimOptions([...impl.availableDims, dimension], model);

        return draggable({
            key: dimension,
            draggableId: dimension,
            index: idx,
            item: (dndProps, dndState) => {
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
                                onChange: newDim => impl.replacePendingDimAtIdx(newDim, idx)
                            })
                        }),
                        button({
                            icon: Icon.delete(),
                            className: 'xh-grouping-chooser__row__remove-btn',
                            minimal: true,
                            onClick: () => impl.removePendingDimAtIdx(idx)
                        })
                    ],
                    ref: dndProps.innerRef,
                    ...dndProps.draggableProps
                });
            }
        });
    }
});

const addDimensionControl = hoistCmp.factory<WithLocalModelProps>({
    render({model, impl}) {
        if (!impl.isAddEnabled) return null;
        const options = getDimOptions(impl.availableDims, model);
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
                    onChange: newDim => impl.addPendingDim(newDim)
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
const favoritesButton = hoistCmp.factory<WithLocalModelProps>({
    render({model, impl}) {
        if (!model.persistFavorites) return null;
        return button({
            icon: Icon.favorite(),
            minimal: true,
            className: 'xh-grouping-chooser__favorite-button',
            onClick: () => impl.toggleFavoritesMenu()
        });
    }
});

const favoritesMenu = hoistCmp.factory<WithLocalModelProps>({
    render({model, impl}) {
        const options = model.favoritesOptions;

        if (isEmpty(options)) {
            return placeholder('No favorites saved...');
        }

        const items = options.map(it => favoriteMenuItem({...it, impl}));
        return div({items});
    }
});

interface FavoriteMenuItemProps extends WithLocalModelProps {
    value: string[];
    label: string;
}

const favoriteMenuItem = hoistCmp.factory<FavoriteMenuItemProps>({
    render({model, value, label, impl}) {
        return hbox({
            className: 'xh-grouping-chooser__favorite',
            items: [
                button({
                    text: label,
                    minimal: true,
                    flex: 1,
                    onClick: () => {
                        model.setValue(value);
                        impl.closePopover();
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
