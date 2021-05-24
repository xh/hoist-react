import {div, filler, vbox, vspacer} from '@xh/hoist/cmp/layout';
import {storeFilterField} from '@xh/hoist/cmp/store';
import {tabContainer} from '@xh/hoist/cmp/tab';
import {hoistCmp} from '@xh/hoist/core';
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

export const filterPopover = hoistCmp.factory({
    render({model}) {
        const {filterPopoverModel} = model;
        if (!filterPopoverModel) return null;
        const {isOpen, isFiltered, setFilterGridModel, colId, xhColumn, type, tabContainerModel} = filterPopoverModel,
            isSetFilter = tabContainerModel.activeTabId === 'setFilter';

        return popover({
            className: 'xh-grid-header-menu-icon',
            position: 'bottom',
            boundary: 'viewport',
            hasBackdrop: true,
            interactionKind: 'click',
            isOpen,
            onInteraction: (open) => {
                if (!open) filterPopoverModel.cancelAndUndoFilters();
            },
            target: div({
                item: isFiltered ? Icon.filter() : Icon.bars(),
                onClick: (e) => {
                    e.stopPropagation();
                    filterPopoverModel.openMenu();
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
                        model: filterPopoverModel,
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
                                    filterPopoverModel.resetSetFilter() :
                                    filterPopoverModel.resetCustomFilter();
                            }
                        }),
                        filler(),
                        button({
                            text: 'Cancel',
                            onClick: () => filterPopoverModel.cancelAndUndoFilters()
                        }),
                        button({
                            icon: Icon.check(),
                            text: 'Apply',
                            intent: 'success',
                            onClick: () => {
                                isSetFilter ?
                                    filterPopoverModel.commitSetFilter() :
                                    filterPopoverModel.commitCustomFilter();
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
