/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {box, div, filler, fragment, hbox, vbox} from '@xh/hoist/cmp/layout';
import {hoistCmp, HoistModel, HoistProps, useLocalModel, uses} from '@xh/hoist/core';
import {button, ButtonProps} from '@xh/hoist/desktop/cmp/button';
import {MENU_PORTAL_ID, select} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {menu, menuDivider, menuItem, popover} from '@xh/hoist/kit/blueprint';
import {dragDropContext, draggable, droppable} from '@xh/hoist/kit/react-beautiful-dnd';
import {action, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {createObservableRef, splitLayoutProps} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {compact, difference, isEmpty, isEqual, sortBy} from 'lodash';
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

class GroupingChooserLocalModel extends HoistModel {
    private readonly model: GroupingChooserModel;

    @observable.ref pendingValue: string[] = [];
    @observable editorIsOpen: boolean = false;
    @observable favoritesIsOpen: boolean = false;

    popoverRef = createObservableRef<HTMLElement>();

    constructor(model: GroupingChooserModel) {
        super();
        makeObservable(this);

        this.model = model;

        this.addReaction({
            track: () => this.pendingValue,
            run: () => {
                if (model.commitOnChange) model.setValue(this.pendingValue);
            }
        });
    }

    @computed
    get availableDims(): string[] {
        return difference(this.model.dimensionNames, this.pendingValue);
    }

    @computed
    get isValid(): boolean {
        return this.model.validateValue(this.pendingValue);
    }

    @computed
    get isAddEnabled(): boolean {
        const {pendingValue, availableDims} = this,
            {maxDepth, dimensionNames} = this.model,
            limit =
                maxDepth > 0 ? Math.min(maxDepth, dimensionNames.length) : dimensionNames.length,
            atMaxDepth = pendingValue.length === limit;
        return !atMaxDepth && !isEmpty(availableDims);
    }

    @action
    toggleEditor() {
        this.pendingValue = this.model.value;
        this.editorIsOpen = !this.editorIsOpen;
        this.favoritesIsOpen = false;
    }

    @action
    toggleFavoritesMenu() {
        this.favoritesIsOpen = !this.favoritesIsOpen;
        this.editorIsOpen = false;
    }

    @action
    closePopover() {
        this.editorIsOpen = false;
        this.favoritesIsOpen = false;
    }

    //-------------------------
    // Value handling
    //-------------------------

    @action
    addPendingDim(dimName: string) {
        if (!dimName) return;
        this.pendingValue = [...this.pendingValue, dimName];
    }

    @action
    replacePendingDimAtIdx(dimName: string, idx: number) {
        if (!dimName) return this.removePendingDimAtIdx(idx);
        const pendingValue = [...this.pendingValue];
        pendingValue[idx] = dimName;
        this.pendingValue = pendingValue;
    }

    @action
    removePendingDimAtIdx(idx: number) {
        const pendingValue = [...this.pendingValue];
        pendingValue.splice(idx, 1);
        this.pendingValue = pendingValue;
    }

    @action
    movePendingDimToIndex(dimName: string, toIdx: number) {
        const pendingValue = [...this.pendingValue],
            dim = pendingValue.find(it => it === dimName),
            fromIdx = pendingValue.indexOf(dim);

        pendingValue.splice(toIdx, 0, pendingValue.splice(fromIdx, 1)[0]);
        this.pendingValue = pendingValue;
    }

    @action
    commitPendingValueAndClose() {
        const {pendingValue, model} = this,
            {value} = model;

        if (!isEqual(value, pendingValue) && model.validateValue(pendingValue)) {
            model.setValue(pendingValue);
        }

        this.closePopover();
    }

    //--------------------
    // Drag Drop
    //--------------------

    onDragEnd(result) {
        const {draggableId, destination} = result;
        if (!destination) return;
        this.movePendingDimToIndex(draggableId, destination.index);
    }
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
                    favoritesIcon({impl})
                ),
                content: favoritesIsOpen
                    ? favoritesMenu()
                    : editorIsOpen
                    ? editor({popoverWidth, popoverMinHeight, popoverTitle, emptyText, impl})
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

interface WithLocalModelProps extends HoistProps<GroupingChooserModel> {
    impl: GroupingChooserLocalModel;
}

//------------------
// Editor
//------------------

interface EditorProps
    extends WithLocalModelProps,
        Pick<
            GroupingChooserProps,
            'emptyText' | 'popoverMinHeight' | 'popoverWidth' | 'popoverTitle'
        > {
    impl: GroupingChooserLocalModel;
}

const editor = hoistCmp.factory<EditorProps>({
    render({popoverWidth, popoverMinHeight, popoverTitle, emptyText, impl}) {
        return panel({
            width: popoverWidth,
            minHeight: popoverMinHeight,
            items: [
                div({className: 'xh-popup__title', item: popoverTitle, omit: !popoverTitle}),
                dimensionList({emptyText, impl}),
                addDimensionControl({impl}),
                filler()
            ]
        });
    }
});

interface DimensionListProps extends WithLocalModelProps {
    emptyText: string;
}

const dimensionList = hoistCmp.factory<DimensionListProps>({
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
                // Because the popover uses css transforms to position itself,
                // we need to adjust the draggable's transform to account for this.
                //
                // The below workaround is based on approaches discussed on this thread:
                // https://github.com/atlassian/react-beautiful-dnd/issues/128
                let transform = dndProps.draggableProps.style.transform;
                if (dndState.isDragging || dndState.isDropAnimating) {
                    let rowValues = parseTransform(transform),
                        popoverValues = parseTransform(impl.popoverRef.current.style.transform);

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
                                onChange: newDim => impl.replacePendingDimAtIdx(newDim, idx)
                            })
                        }),
                        button({
                            icon: Icon.delete(),
                            intent: 'danger',
                            tabIndex: -1,
                            className: 'xh-grouping-chooser__row__remove-btn',
                            onClick: () => impl.removePendingDimAtIdx(idx)
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

const addDimensionControl = hoistCmp.factory<WithLocalModelProps>({
    render({model, impl}) {
        if (!impl.isAddEnabled) return null;
        const options = getDimOptions(impl.availableDims, model);
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
                    onChange: newDim => impl.addPendingDim(newDim)
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
function parseTransform(transformStr) {
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

function targetIsControlButtonOrPortal(target) {
    const selectPortal = document.getElementById(MENU_PORTAL_ID)?.contains(target),
        selectClick = targetWithin(target, 'xh-select__single-value'),
        editorClick = targetWithin(target, 'xh-grouping-chooser-button--with-favorites');
    return selectPortal || selectClick || editorClick;
}

/**
 * Determines whether any of the target's parents have a specific class name
 */
function targetWithin(target, className): boolean {
    for (let elem = target; elem; elem = elem.parentElement) {
        if (elem.classList.contains(className)) return true;
    }
    return false;
}

//------------------
// Favorites
//------------------

const favoritesIcon = hoistCmp.factory<WithLocalModelProps>({
    render({model, impl}) {
        if (!model.persistFavorites) return null;
        return div({
            item: Icon.favorite(),
            className: 'xh-grouping-chooser__favorite-icon',
            onClick: e => {
                impl.toggleFavoritesMenu();
                e.stopPropagation();
            }
        });
    }
});

const favoritesMenu = hoistCmp.factory<GroupingChooserModel>({
    render({model}) {
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

        return vbox(div({className: 'xh-popup__title', item: 'Favorites'}), menu({items}));
    }
});

interface FavoriteMenuItemProps extends HoistProps<GroupingChooserModel> {
    value: string[];
    label: string;
}

const favoriteMenuItem = hoistCmp.factory<FavoriteMenuItemProps>({
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
