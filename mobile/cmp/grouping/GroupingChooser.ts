/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {GroupingChooserLocalModel} from '@xh/hoist/cmp/grouping/impl/GroupingChooserLocalModel';
import {sortableList} from '@xh/hoist/cmp/sortablelist';
import {box, div, filler, hbox, placeholder, span} from '@xh/hoist/cmp/layout';
import {hoistCmp, useLocalModel, uses} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import type {ButtonProps} from '@xh/hoist/mobile/cmp/button';
import {button} from '@xh/hoist/mobile/cmp/button';
import {select} from '@xh/hoist/mobile/cmp/input';
import '@xh/hoist/mobile/register';
import {dialogPanel, panel} from '@xh/hoist/mobile/cmp/panel';
import {splitLayoutProps} from '@xh/hoist/utils/react';
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
        const impl = useLocalModel(GroupingChooserLocalModel),
            {value, allowEmpty} = model,
            label = isEmpty(value) && allowEmpty ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest);

        return box({
            ref,
            className,
            ...layoutProps,
            children: [
                button({
                    className: 'xh-grouping-chooser-button',
                    ...buttonProps,
                    children: span(label),
                    onClick: () => impl.toggleEditor()
                }),
                dialogCmp({model: impl, dialogTitle, emptyText})
            ]
        });
    }
});

const dialogCmp = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, dialogTitle, emptyText}) {
        const {parentModel} = model;
        return dialogPanel({
            isOpen: model.editorIsOpen,
            title: dialogTitle,
            icon: Icon.treeList(),
            children: [
                editor({emptyText}),
                favoritesChooser({omit: !parentModel.persistFavorites})
            ],
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
    model: false,
    render({emptyText}) {
        return panel({
            className: 'xh-grouping-chooser__editor',
            scrollable: true,
            children: dimensionList({emptyText})
        });
    }
});

const dimensionList = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, emptyText}) {
        const {parentModel} = model;
        return sortableList({
            className: 'xh-grouping-chooser__list',
            value: model.pendingValue,
            itemKey: dim => dim,
            getItemLabel: dim => parentModel.getDimDisplayName(dim),
            emptyText: parentModel.allowEmpty ? emptyText : null,
            onReorder: e => model.movePendingDimToIndex(e.item, e.toIndex),
            onRemove: e => model.removePendingDimAtIdx(e.index),
            onAdd: e => model.addPendingDim(e.item),
            itemRenderer: (dimension, {index}) => dimensionRow({dimension, idx: index}),
            addRenderer: model.isAddEnabled ? ({add}) => addLevelSelect({add}) : null
        });
    }
});

const dimensionRow = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, dimension, idx}) {
        // The options for this select include its current value
        const options = model.getDimSelectOpts([...model.availableDims, dimension]);

        return div({
            className: 'xh-grouping-chooser__row',
            children: [
                div({
                    className: 'xh-grouping-chooser__row__select',
                    children: select({
                        options,
                        value: dimension,
                        flex: 1,
                        width: null,
                        hideDropdownIndicator: true,
                        onChange: newDim => model.replacePendingDimAtIdx(newDim, idx)
                    })
                })
            ]
        });
    }
});

const addLevelSelect = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, add}) {
        const options = model.getDimSelectOpts();
        return select({
            // A new key when the options change clears the select's typed text.
            key: JSON.stringify(options),
            options,
            placeholder: 'Add level...',
            flex: 1,
            width: null,
            hideDropdownIndicator: true,
            hideSelectedOptionCheck: true,
            onChange: add
        });
    }
});

//------------------
// Favorites
//------------------
const favoritesChooser = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model}) {
        const {parentModel} = model,
            {favoritesOptions: options} = parentModel,
            {isAddFavoriteEnabled} = model,
            items = isEmpty(options)
                ? [placeholder('No favorites saved.')]
                : options.map(it => favoriteItem(it));

        return panel({
            title: 'Favorites',
            icon: Icon.favorite(),
            className: 'xh-grouping-chooser__favorites',
            scrollable: true,
            children: [
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

const favoriteItem = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, value, label}) {
        const {parentModel} = model;
        return hbox({
            className: 'xh-grouping-chooser__favorites__favorite',
            children: [
                button({
                    text: label,
                    minimal: true,
                    flex: 1,
                    onClick: () => {
                        parentModel.setValue(value);
                        model.closeEditor();
                    }
                }),
                button({
                    icon: Icon.delete(),
                    minimal: true,
                    onClick: () => parentModel.removeFavorite(value)
                })
            ]
        });
    }
});
