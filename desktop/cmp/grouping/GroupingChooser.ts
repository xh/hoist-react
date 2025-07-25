/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
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
import {hoistCmp, Side, uses} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {menu, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {apiDeprecated, elemWithin, getTestId} from '@xh/hoist/utils/js';
import {splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isEmpty, isNil, isUndefined} from 'lodash';
import './GroupingChooser.scss';
import {ReactNode} from 'react';

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

    /** @deprecated - use `editorTitle` instead */
    popoverTitle?: ReactNode;

    /**
     * Width in pixels of the popover menu itself.
     * If unspecified, will default based on favorites enabled status + side.
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
            editorTitle = 'Group By',
            emptyText = 'Ungrouped',
            favoritesSide = 'right',
            favoritesTitle = 'Favorites',
            popoverWidth,
            popoverMinHeight,
            popoverTitle,
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
            [layoutProps, buttonProps] = splitLayoutProps(rest),
            favesClassNameMod = `faves-${persistFavorites ? favoritesSide : 'disabled'}`,
            favesTB = isTB(favoritesSide);

        if (!isUndefined(popoverTitle)) {
            apiDeprecated('GroupingChooser.popoverTitle', {
                msg: `Update to use 'editorTitle' instead`,
                v: `v78`,
                source: GroupingChooser
            });
            editorTitle = popoverTitle;
        }

        popoverWidth = popoverWidth || (persistFavorites && !favesTB ? 500 : 250);

        return box({
            ref,
            className,
            ...layoutProps,
            item: popover({
                isOpen,
                popoverRef: model.popoverRef,
                popoverClassName: `xh-grouping-chooser-popover xh-grouping-chooser-popover--${favesClassNameMod} xh-popup--framed`,
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
const popoverCmp = hoistCmp.factory<Partial<GroupingChooserProps>>({
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
        const {persistFavorites} = model,
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
                    omit: !model.persistFavorites || (!model.hasFavorites && favesTB),
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
            items: itemsContainer({items}),
            bbar: toolbar({
                compact: true,
                omit: !model.persistFavorites,
                items: [filler(), favoritesAddBtn({testId})]
            })
        });
    }
});

const editor = hoistCmp.factory<GroupingChooserModel>({
    render({editorTitle, emptyText, testId}) {
        return vbox({
            className: 'xh-grouping-chooser__editor',
            testId,
            items: [
                div({className: 'xh-popup__title', item: editorTitle, omit: isNil(editorTitle)}),
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
        const options = model.getDimSelectOpts([...model.availableDims, dimension]);

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

        const options = model.getDimSelectOpts();
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
 * Extract integer values from CSS transform string. Works for both `translate` and `translate3d`.
 * e.g. `translate3d(250px, 150px, 0px) -> [250, 150, 0]`
 */
function parseTransform(transformStr: string): number[] {
    return transformStr
        ?.replace('3d', '')
        .match(/[-]{0,1}[\d]*[.]{0,1}[\d]+/g)
        ?.map(it => parseInt(it));
}

//------------------
// Favorites
//------------------
const favoritesChooser = hoistCmp.factory<GroupingChooserModel>({
    render({model, favoritesSide, favoritesTitle, testId}) {
        const {favoritesOptions: options, hasFavorites} = model;

        return vbox({
            className: `xh-grouping-chooser__favorites xh-grouping-chooser__favorites--${favoritesSide}`,
            testId,
            items: [
                div({
                    className: 'xh-popup__title',
                    item: favoritesTitle,
                    omit: isNil(favoritesTitle)
                }),
                hasFavorites
                    ? menu({
                          items: options.map(it => favoriteMenuItem(it))
                      })
                    : placeholder('No favorites saved.')
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

const favoritesAddBtn = hoistCmp.factory<GroupingChooserModel>({
    render({model, testId}) {
        return button({
            text: 'Save as Favorite',
            icon: Icon.favorite(),
            className: 'xh-grouping-chooser__favorites__add-btn',
            testId: getTestId(testId, 'favorites-add-btn'),
            omit: !model.persistFavorites,
            disabled: !model.isAddFavoriteEnabled,
            onClick: () => model.addPendingAsFavorite()
        });
    }
});

const isTB = (favoritesSide: Side) => favoritesSide === 'top' || favoritesSide === 'bottom';
