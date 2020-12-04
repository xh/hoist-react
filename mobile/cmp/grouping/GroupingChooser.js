/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2020 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {div, hbox, vbox, filler, box, placeholder} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {button, Button} from '@xh/hoist/mobile/cmp/button';
import {dialog} from '@xh/hoist/mobile/cmp/dialog';
import {select} from '@xh/hoist/mobile/cmp/input';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import {compact, isEmpty, sortBy} from 'lodash';
import classNames from 'classnames';
import PT from 'prop-types';

import './GroupingChooser.scss';

/**
 * Control for selecting a list of dimensions for grouping APIs.
 * @see GroupingChooserModel
 */
export const [GroupingChooser, groupingChooser] = hoistCmp.withFactory({
    displayName: 'GroupingChooser',
    model: uses(GroupingChooserModel),
    className: 'xh-grouping-chooser',

    render({
        model,
        className,
        emptyText = 'Ungrouped',
        popoverWidth = 250,
        popoverTitle = 'Group By',
        ...rest
    }) {
        const {value} = model,
            label = isEmpty(value) ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest);

        return box({
            className,
            ...layoutProps,
            items: [
                popoverCmp({popoverTitle, popoverWidth}),
                button({
                    className: 'xh-grouping-chooser-button',
                    item: label,
                    ...buttonProps,
                    onClick: () => model.showEditor()
                }),
                favoritesButton()
            ]
        });
    }
});

GroupingChooser.propTypes = {
    ...Button.propTypes,

    /** Text to represent empty state (i.e. value = null or [])*/
    emptyText: PT.string,

    /** Primary component model instance. */
    model: PT.instanceOf(GroupingChooserModel),

    /** Title for popover (default "GROUP BY") or null to suppress. */
    popoverTitle: PT.string,

    /** Width in pixels of the popover menu itself. */
    popoverWidth: PT.number
};

//---------------------------
// Popover
//---------------------------
const popoverCmp = hoistCmp.factory(
    ({model, popoverTitle, popoverWidth}) => {
        const {editorIsOpen, favoritesIsOpen, isValid, value} = model,
            isOpen = editorIsOpen || favoritesIsOpen,
            addFavoriteDisabled = isEmpty(value) || !!model.isFavorite(value),
            addDimDisabled = !!model.addDisabledMsg;

        return dialog({
            isOpen,
            title: favoritesIsOpen ? 'Favorites' : popoverTitle,
            icon: favoritesIsOpen ? Icon.favorite({prefix: 'fas'}) : Icon.treeList(),
            className: 'xh-grouping-chooser-popover',
            width: popoverWidth,
            content: favoritesIsOpen ? favoritesMenu() : editor(),
            onCancel: () => model.closePopover(),
            buttons: favoritesIsOpen ?
                [
                    button({
                        icon: Icon.add(),
                        flex: 1,
                        text: 'Add current grouping to favorites',
                        disabled: addFavoriteDisabled,
                        onClick: () => model.addFavorite(model.value)
                    })
                ] :
                [
                    button({
                        icon: Icon.add(),
                        disabled: !!addDimDisabled,
                        onClick: () => model.toggleAddControl()
                    }),
                    filler(),
                    button({
                        icon: Icon.close(),
                        modifier: 'quiet',
                        onClick: () => model.closePopover()
                    }),
                    button({
                        icon: Icon.check(),
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
    render({model}) {
        return vbox(
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
            addDimensionControl()
        );
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
                            modifier: 'quiet',
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

const addDimensionControl = hoistCmp.factory({
    render({model}) {
        if (!model.showAddControl || model.addDisabledMsg) return null;
        const options = getDimOptions(model.availableDims, model);
        return div({
            className: 'xh-grouping-chooser__add-control',
            items: [
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
const favoritesButton = hoistCmp.factory({
    render({model}) {
        if (!model.persistFavorites) return null;
        const isFavorite = model.isFavorite(model.value);
        return button({
            icon: Icon.favorite({prefix: isFavorite ? 'fas' : 'far'}),
            modifier: 'quiet',
            className: classNames(
                'xh-grouping-chooser__favorite-button',
                isFavorite ? 'xh-grouping-chooser__favorite-button--active' : null
            ),
            onClick: () => model.openFavoritesMenu()
        });
    }
});

const favoritesMenu = hoistCmp.factory({
    render({model}) {
        const options = model.favoritesOptions;

        if (isEmpty(options)) {
            return placeholder('You have not yet saved any favorites...');
        }

        const items = options.map(it => favoriteMenuItem(it));
        return div({items});
    }
});

const favoriteMenuItem = hoistCmp.factory({
    render({model, value, label}) {
        return hbox({
            className: 'xh-grouping-chooser__favorite',
            items: [
                button({
                    text: label,
                    modifier: 'quiet',
                    flex: 1,
                    onClick: () => {
                        model.setValue(value);
                        model.closePopover();
                    }
                }),
                button({
                    icon: Icon.delete({className: 'xh-intent-danger'}),
                    modifier: 'quiet',
                    onClick: () => model.removeFavorite(value)
                })
            ]
        });
    }
});
