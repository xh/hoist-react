/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {box, div, filler, hbox, placeholder, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {button, ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {select} from '@xh/hoist/mobile/cmp/input';
import '@xh/hoist/mobile/register';
import {dialogPanel, panel} from '@xh/hoist/mobile/cmp/panel';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty} from 'lodash';

import './GroupingChooser.scss';

export interface GroupingChooserProps extends ButtonProps<GroupingChooserModel> {
    /** Custom title for editor dialog, or null to suppress. */
    dialogTitle?: string;
    /** Text to represent empty state (i.e. value = null or [])*/
    emptyText?: string;
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
        {model, className, dialogTitle = 'Choose Group By', emptyText = 'Ungrouped', ...rest},
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
                button({
                    className: 'xh-grouping-chooser-button',
                    item: span(label),
                    ...buttonProps,
                    onClick: () => model.toggleEditor()
                }),
                dialogCmp({dialogTitle, emptyText})
            ]
        });
    }
});

const dialogCmp = hoistCmp.factory<GroupingChooserModel>({
    render({model, dialogTitle, emptyText}) {
        return dialogPanel({
            isOpen: model.editorIsOpen,
            title: dialogTitle,
            icon: Icon.treeList(),
            items: [editor({emptyText}), favoritesChooser({omit: !model.persistFavorites})],
            bbar: [
                filler(),
                button({
                    text: 'Cancel',
                    minimal: true,
                    onClick: () => model.closeEditor()
                }),
                button({
                    text: 'Apply',
                    icon: Icon.check(),
                    intent: 'primary',
                    outlined: true,
                    disabled: !model.isValid,
                    onClick: () => model.commitPendingValueAndClose()
                })
            ]
        });
    }
});

//------------------
// Editor
//------------------
const editor = hoistCmp.factory({
    render({emptyText}) {
        return panel({
            className: 'xh-grouping-chooser__editor',
            scrollable: true,
            items: [dimensionList({emptyText}), addDimensionControl()]
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
        const options = model.getDimSelectOpts([...model.availableDims, dimension]);

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

        const options = model.getDimSelectOpts();
        return div({
            className: 'xh-grouping-chooser__add-control',
            items: [
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

//------------------
// Favorites
//------------------
const favoritesChooser = hoistCmp.factory<GroupingChooserModel>({
    render({model}) {
        const {favoritesOptions: options, isAddFavoriteEnabled} = model,
            items = isEmpty(options)
                ? [placeholder('No favorites saved.')]
                : options.map(it => favoriteItem(it));

        return panel({
            title: 'Favorites',
            icon: Icon.favorite(),
            className: 'xh-grouping-chooser__favorites',
            scrollable: true,
            items: [
                ...items,
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

const favoriteItem = hoistCmp.factory<GroupingChooserModel>({
    render({model, value, label}) {
        return hbox({
            className: 'xh-grouping-chooser__favorites__favorite',
            items: [
                button({
                    text: label,
                    minimal: true,
                    flex: 1,
                    onClick: () => {
                        model.setValue(value);
                        model.closeEditor();
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
