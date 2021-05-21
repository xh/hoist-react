/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2021 Extremely Heavy Industries Inc.
 */
import {ColumnHeaderModel} from '@xh/hoist/cmp/grid/impl/ColumnHeaderModel';
import {div, filler, span, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {creates, hoistCmp, XH} from '@xh/hoist/core';
import {button} from '@xh/hoist/desktop/cmp/button';
import {
    buttonGroupInput,
    dateInput,
    numberInput,
    select,
    textInput
} from '@xh/hoist/desktop/cmp/input';
import {panel} from '@xh/hoist/desktop/cmp/panel';
import {toolbar} from '@xh/hoist/desktop/cmp/toolbar';
import {Icon} from '@xh/hoist/icon';
import {popover} from '@xh/hoist/kit/blueprint';
import {useOnMount} from '@xh/hoist/utils/react';
import classNames from 'classnames';
import {isFunction, isString, isUndefined} from 'lodash';

/**
 * A custom ag-Grid header component.
 *
 * Relays sorting events directly to the controlling GridModel. Supports absolute value sorting
 * by checking `Column.absSort` to determine next sortBy and by rendering custom sort icons.
 *
 * @private
 */
export const columnHeader = hoistCmp.factory({
    displayName: 'ColumnHeader',
    className: 'xh-grid-header',
    model: creates(ColumnHeaderModel),

    render({model, ...props}) {
        useOnMount(() => model.init(props));

        const sortIcon = () => {
            const {abs, sort} = model.activeGridSorter ?? {};
            if (!sort) return null;

            let icon;
            if (sort === 'asc') {
                icon = abs ? Icon.arrowToTop({size: 'sm'}) : Icon.arrowUp({size: 'sm'});
            } else if (sort === 'desc') {
                icon = abs ? Icon.arrowToBottom({size: 'sm'}) : Icon.arrowDown({size: 'sm'});
            }
            return div({className: 'xh-grid-header-sort-icon', item: icon});
        };

        const menuIcon = () => {
            return model.enableFilter ? filterPopover() : null;
        };

        const extraClasses = [
            model.isFiltered ? 'xh-grid-header-filtered' : null,
            model.activeGridSorter ? 'xh-grid-header-sorted' : null,
            model.hasNonPrimarySort ? 'xh-grid-header-multisort' : null
        ];

        const {xhColumn, gridModel} = model,
            {isDesktop} = XH;

        // `props.displayName` is the output of the Column `headerValueGetter` and should always be a string
        // If `xhColumn` is present, it can consulted for a richer `headerName`
        let headerElem = props.displayName;
        if (xhColumn) {
            headerElem = isFunction(xhColumn.headerName) ?
                xhColumn.headerName({column: xhColumn, gridModel}) :
                xhColumn.headerName;
        }

        // If no app tooltip dynamically toggle a tooltip to display elided header
        let onMouseEnter = null;
        if (isDesktop && isUndefined(xhColumn?.headerTooltip)) {
            onMouseEnter = ({target: el}) => {
                if (el.offsetWidth < el.scrollWidth) {
                    const title = isString(headerElem) ? headerElem : props.displayName;
                    el.setAttribute('title', title);
                } else {
                    el.removeAttribute('title');
                }
            };
        }

        return div({
            className: classNames(props.className, extraClasses),
            onClick:        isDesktop  ? model.onClick : null,
            onDoubleClick:  isDesktop  ? model.onDoubleClick : null,
            onMouseDown:    isDesktop  ? model.onMouseDown : null,
            onTouchStart:   !isDesktop ? model.onTouchStart : null,
            onTouchEnd:     !isDesktop ? model.onTouchEnd : null,

            items: [
                span({onMouseEnter, item: headerElem}),
                sortIcon(),
                menuIcon()
            ]
        });
    }
});

export const filterPopover = hoistCmp.factory({
    render({model}) {
        if (!model) {return null}
        const {isOpen, isFiltered, setFilterGridModel, colId, xhColumn, type, tabContainerModel} = model,
            isSetFilter = tabContainerModel.activeTabId === 'setFilter';

        return popover({
            className: 'xh-grid-header-menu-icon',
            position: 'bottom',
            boundary: 'viewport',
            hasBackdrop: true,
            interactionKind: 'click',
            isOpen,
            onInteraction: (open) => {
                if (!open) model.cancelAndUndoFilters();
            },
            target: div({
                item: isFiltered ? Icon.filter() : Icon.bars(),
                onClick: (e) => {
                    e.stopPropagation();
                    model.openMenu();
                }
            }),
            content: panel({
                onClick: (e) => e.stopPropagation(),
                compactHeader: true,
                title: `Filter ${xhColumn.displayName} by:`,
                headerItems: [
                    buttonGroupInput({
                        minHeight: 20,
                        maxHeight: 20,
                        marginRight: 2,
                        model: model,
                        intent: 'primary',
                        bind: 'tabId',
                        items: [
                            button({
                                style: {
                                    fontSize: 10,
                                    minHeight: 20,
                                    maxHeight: 20
                                },
                                value: 'setFilter',
                                text: 'Set',
                                width: 40
                            }),
                            button({
                                disabled: type === 'bool',
                                style: {
                                    fontSize: 10,
                                    minHeight: 20,
                                    maxHeight: 20
                                },
                                value: 'customFilter',
                                text: 'Custom',
                                width: 40
                            })
                        ]
                    })
                ],
                item: tabContainer({
                    model: tabContainerModel
                }),
                tbar: toolbar({
                    omit: !isSetFilter,
                    compact: true,
                    item: storeFilterField({
                        model: model,
                        bind: 'filterText',
                        icon: null,
                        flex: 1,
                        store: setFilterGridModel.store,
                        includeFields: [colId]
                    })
                }),
                bbar: toolbar({
                    compact: true,
                    items: [
                        button({
                            icon: Icon.undo(),
                            text: 'Reset',
                            intent: 'danger',
                            onClick: () => {
                                isSetFilter ?
                                    model.resetSetFilter() :
                                    model.resetCustomFilter();
                            }
                        }),
                        filler(),
                        button({
                            text: 'Cancel',
                            onClick: () => model.cancelAndUndoFilters()
                        }),
                        button({
                            icon: Icon.check(),
                            text: 'Apply',
                            intent: 'success',
                            onClick: () => {
                                isSetFilter ?
                                    model.commitSetFilter() :
                                    model.commitCustomFilter();
                            }
                        })
                    ]
                })
            })
        });
    }
});

export const customFilter = hoistCmp.factory({
    render({model}) {
        const {type} = model;
        let cmp;
        switch (type) {
            case 'number':
            case 'int':
                cmp = numberInput({
                    bind: 'inputVal',
                    enableShorthandUnits: true,
                    enableClear: true
                }); break;
            case 'localDate':
            case 'date':
                cmp = dateInput({
                    bind: 'inputVal',
                    valueType: type,
                    enableClear: true
                }); break;
            default:
                cmp = textInput({bind: 'inputVal', enableClear: true});
        }

        return vbox({
            alignItems: 'center',
            justifyContent: 'center',
            items: [
                select({
                    bind: 'op',
                    options:
                        ['number', 'int', 'localDate', 'date'].includes(type) ?
                            [
                                {label: 'Equals', value: '='},
                                {label: 'Not Equals', value: '!='},
                                {label: 'Greater Than', value: '>'},
                                {label: 'Greater Than Or Equal to', value: '>='},
                                {label: 'Less Than', value: '<'},
                                {label: 'Less Than or Equal to', value: '<='}
                            ] :
                            [
                                {label: 'Equals', value: '='},
                                {label: 'Not Equals', value: '!='},
                                {label: 'Contains', value: 'like'}
                            ]
                }),
                vspacer(),
                cmp
            ],
            height: 250,
            width: 240
        });
    }
});
