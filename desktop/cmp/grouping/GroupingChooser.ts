/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {GroupingChooserLocalModel} from '@xh/hoist/cmp/grouping/impl/GroupingChooserLocalModel';
import {sortableList} from '@xh/hoist/cmp/sortablelist';
import {
    box,
    div,
    filler,
    fragment,
    frame,
    hbox,
    hframe,
    placeholder,
    vbox,
    vframe
} from '@xh/hoist/cmp/layout';
import type {Side} from '@xh/hoist/core';
import {hoistCmp, useLocalModel, uses} from '@xh/hoist/core';
import type {ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {button} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {menu, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {elemWithin, getTestId} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty, isNil} from 'lodash';
import './GroupingChooser.scss';
import type {ReactNode} from 'react';

export interface GroupingChooserProps extends ButtonProps<GroupingChooserModel> {
    /** Title for value-editing portion of popover, or null to suppress. */
    editorTitle?: ReactNode;

    /** Text to represent empty state (i.e. value = null or []) */
    emptyText?: string;

    /**
     * Side of the popover, relative to the value-editing controls, on which the Favorites list
     * should be rendered, if enabled.
     */
    favoritesSide?: Side;

    /** Title for favorites-list portion of popover, or null to suppress. */
    favoritesTitle?: ReactNode;

    /** Min height in pixels of the popover menu itself. */
    popoverMinHeight?: number;

    /** Position of popover relative to target button. */
    popoverPosition?: 'bottom' | 'top';

    /**
     * Width in pixels of the popover menu itself.
     * If unspecified, will default based on favorites enabled status + side.
     */
    popoverWidth?: number;

    /**
     * True (default) to style trigger button background and borders to match inputs. Set to false
     * to render an outlined button instead.
     */
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
            editorTitle = 'Group By',
            emptyText = 'Ungrouped',
            favoritesSide = 'right',
            favoritesTitle = 'Favorites',
            popoverWidth,
            popoverMinHeight,
            popoverPosition = 'bottom',
            styleButtonAsInput = true,
            testId,
            ...rest
        },
        ref
    ) {
        const impl = useLocalModel(GroupingChooserLocalModel),
            {value, allowEmpty, persistFavorites} = model,
            {editorIsOpen} = impl,
            isOpen = editorIsOpen,
            label = isEmpty(value) && allowEmpty ? emptyText : model.getValueLabel(value),
            [layoutProps, buttonProps] = splitLayoutProps(rest),
            favesClassNameMod = `faves-${persistFavorites ? favoritesSide : 'disabled'}`,
            favesTB = isTB(favoritesSide);

        popoverWidth = popoverWidth || (persistFavorites && !favesTB ? 500 : 250);

        return box({
            ref,
            className,
            ...layoutProps,
            children: popover({
                isOpen,
                popoverClassName: `xh-grouping-chooser-popover xh-grouping-chooser-popover--${favesClassNameMod}`,
                // Left align editor to keep in place when button changing size when commitOnChange: true
                position: `${popoverPosition}-left`,
                minimal: false,
                children: fragment(
                    button({
                        text: label,
                        title: label,
                        tabIndex: -1,
                        className: classNames(
                            'xh-grouping-chooser-button',
                            styleButtonAsInput ? 'xh-grouping-chooser-button--as-input' : null
                        ),
                        // Input mode relies on the `--as-input` class for its chrome, so renders
                        // minimal. Button mode renders outlined, to match the ViewManager trigger.
                        ...(styleButtonAsInput ? {minimal: true} : {outlined: true}),
                        active: isOpen,
                        ...buttonProps,
                        onClick: () => impl.toggleEditor(),
                        testId
                    })
                ),
                content: popoverCmp({
                    model: impl,
                    editorTitle,
                    emptyText,
                    favoritesSide,
                    favoritesTitle,
                    popoverWidth,
                    popoverMinHeight,
                    testId
                }),
                onInteraction: (nextOpenState, e) => {
                    if (
                        isOpen &&
                        nextOpenState === false &&
                        e?.target &&
                        !elemWithin(e.target as HTMLElement, 'xh-grouping-chooser-button')
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
const popoverCmp = hoistCmp.factory<GroupingChooserLocalModel>({
    render({
        model,
        editorTitle,
        emptyText,
        favoritesSide,
        favoritesTitle,
        popoverWidth,
        popoverMinHeight,
        testId
    }) {
        const {parentModel} = model,
            {persistFavorites} = parentModel,
            favesTB = isTB(favoritesSide),
            isFavesFirst = favoritesSide === 'left' || favoritesSide === 'top',
            items = [
                editor({
                    editorTitle,
                    emptyText,
                    testId: getTestId(testId, 'editor')
                }),
                favoritesChooser({
                    // Omit if favorites generally disabled, or if none saved yet AND in top/bottom
                    // orientation - the empty state looks clumsy in that case. Show when empty in
                    // left/right orientation to avoid large jump in popover width.
                    omit: !parentModel.persistFavorites || (!parentModel.hasFavorites && favesTB),
                    favoritesSide,
                    favoritesTitle,
                    testId: getTestId(testId, 'favorites')
                })
            ],
            itemsContainer = !persistFavorites ? frame : favesTB ? vframe : hframe;

        if (isFavesFirst) {
            items.reverse();
        }

        return panel({
            className: 'xh-grouping-chooser-popover__inner',
            width: popoverWidth,
            minHeight: popoverMinHeight,
            children: itemsContainer({children: items}),
            bbar: toolbar({
                compact: true,
                omit: !parentModel.persistFavorites,
                children: [filler(), favoritesAddBtn({testId})]
            })
        });
    }
});

const editor = hoistCmp.factory<GroupingChooserLocalModel>({
    render({editorTitle, emptyText, testId}) {
        return vbox({
            className: 'xh-grouping-chooser__editor',
            testId,
            children: [
                div({
                    className: 'xh-popup__title',
                    children: editorTitle,
                    omit: isNil(editorTitle)
                }),
                dimensionList({emptyText}),
                addDimensionControl()
            ]
        });
    }
});

const dimensionList = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, emptyText}) {
        if (isEmpty(model.pendingValue)) {
            return model.parentModel.allowEmpty
                ? hbox({
                      className: 'xh-grouping-chooser__row',
                      children: [filler(), emptyText, filler()]
                  })
                : null;
        }

        return sortableList({
            className: 'xh-grouping-chooser__list',
            value: model.pendingValue,
            itemKey: dim => dim,
            handle: 'custom',
            getItemLabel: dim => model.parentModel.getDimDisplayName(dim),
            onReorder: e => model.movePendingDimToIndex(e.item, e.toIndex),
            renderItem: (dimension, {index, handleRef}) =>
                dimensionRow({dimension, idx: index, handleRef})
        });
    }
});

const dimensionRow = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, dimension, idx, handleRef}) {
        // The options for this select include its current value
        const options = model.getDimSelectOpts([...model.availableDims, dimension]);

        return div({
            className: 'xh-grouping-chooser__row',
            children: [
                div({
                    ref: handleRef,
                    className: 'xh-grouping-chooser__row__grabber',
                    children: Icon.grip({prefix: 'fal'})
                }),
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
                }),
                button({
                    icon: Icon.delete(),
                    intent: 'danger',
                    tabIndex: -1,
                    className: 'xh-grouping-chooser__row__remove-btn',
                    onClick: () => model.removePendingDimAtIdx(idx)
                })
            ]
        });
    }
});

const addDimensionControl = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model}) {
        if (!model.isAddEnabled) return null;

        const options = model.getDimSelectOpts();
        return div({
            className: 'xh-grouping-chooser__add-control',
            children: [
                div({
                    className: 'xh-grouping-chooser__add-control__icon',
                    children: Icon.grip({prefix: 'fal'})
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

//------------------
// Favorites
//------------------
const favoritesChooser = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, favoritesSide, favoritesTitle, testId}) {
        const {parentModel} = model,
            {favoritesOptions: options, hasFavorites} = parentModel;

        return vbox({
            className: `xh-grouping-chooser__favorites xh-grouping-chooser__favorites--${favoritesSide}`,
            testId,
            children: [
                div({
                    className: 'xh-popup__title',
                    children: favoritesTitle,
                    omit: isNil(favoritesTitle)
                }),
                hasFavorites
                    ? menu({
                          children: options.map(it => favoriteMenuItem(it))
                      })
                    : placeholder('No favorites saved.')
            ]
        });
    }
});

const favoriteMenuItem = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, value, label}) {
        const {parentModel} = model;
        return menuItem({
            text: label,
            className: 'xh-grouping-chooser__favorites__favorite',
            onClick: () => {
                model.setPendingValue(value);
                model.commitPendingValueAndClose();
            },
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

const favoritesAddBtn = hoistCmp.factory<GroupingChooserLocalModel>({
    render({model, testId}) {
        return button({
            text: 'Save as Favorite',
            icon: Icon.favorite(),
            className: 'xh-grouping-chooser__favorites__add-btn',
            testId: getTestId(testId, 'favorites-add-btn'),
            omit: !model.parentModel.persistFavorites,
            disabled: !model.isAddFavoriteEnabled,
            onClick: () => model.addPendingAsFavorite()
        });
    }
});

const isTB = (favoritesSide: Side) => favoritesSide === 'top' || favoritesSide === 'bottom';
