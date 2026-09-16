/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {isEmpty, isFunction, isNil, isString, uniq} from 'lodash';
import {copyToClipboard} from '@xh/hoist/utils/js';
import {hoistCmp, type HoistProps, isMenuHeading, type Some, XH} from '@xh/hoist/core';
import {Column, GridModel} from '@xh/hoist/cmp/grid';
import {
    type ActionFnData,
    RecordAction,
    type RecordActionHeading,
    type RecordActionSpec,
    Store,
    StoreRecord
} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {
    filterConsecutiveMenuSeparators,
    filterMenuHeadings,
    resolveMenuHeading
} from '@xh/hoist/utils/impl';
import {wait} from '@xh/hoist/promise';
import {div, span} from '@xh/hoist/cmp/layout';
import {
    useGridMenuItem,
    type GetContextMenuItemsParams,
    type MenuItemDef,
    type CustomMenuItemProps
} from '@xh/hoist/kit/ag-grid';
import type {GridContextMenuItemLike, GridContextMenuSpec} from '../GridContextMenu';

/**
 * @internal
 */
export function getAgGridMenuItems(
    params: GetContextMenuItemsParams,
    model: GridModel,
    spec: GridContextMenuSpec
): Array<string | MenuItemDef> {
    let menuItems: GridContextMenuItemLike[] = isFunction(spec) ? spec(params, model) : spec;

    if (isEmpty(menuItems)) return null;

    const record = params.node?.data,
        colId = params.column?.getColId(),
        column = !isNil(colId) ? model.getColumn(colId) : null;

    return buildMenuItems(menuItems, record, model, column, params);
}

function buildMenuItems(
    menuItems: GridContextMenuItemLike[],
    record: StoreRecord,
    gridModel: GridModel,
    column: Column,
    agParams: GetContextMenuItemsParams
) {
    // Transform to actions, headings, or ag-Grid ready strings.
    const actions: Array<RecordAction | RecordActionHeading | string> = menuItems.flatMap(it => {
        if (isString(it)) return replaceHoistToken(it, gridModel);
        if (it instanceof RecordAction) return it;
        if (isMenuHeading(it)) return it;
        return new RecordAction(it);
    });

    const actionParams: ActionFnData = {
        record,
        selectedRecords: gridModel.selectedRecords,
        gridModel,
        column,
        agParams
    };

    const ret = [];
    actions.forEach(action => {
        if (isNil(action)) return;

        if (isString(action)) {
            ret.push(action);
            return;
        }

        if (isMenuHeading(action)) {
            const heading = resolveMenuHeading(action, actionParams);
            if (heading) {
                ret.push({
                    menuItem: MenuHeadingItem,
                    menuItemParams: {heading},
                    cssClasses: ['xh-grid-menu-heading', heading.className].filter(Boolean),
                    // ag-Grid has no concept of a non-item entry - it registers every MenuItemDef
                    // as navigable and auto-activates the first one on open. Flagging the heading
                    // disabled is what keeps it out of that, and out of mouse activation. Its
                    // `disabled` and `active` styling is suppressed in Grid.scss.
                    disabled: true
                });
            }
            return;
        }

        const displaySpec = action.getDisplaySpec(actionParams);
        if (displaySpec.hidden) return;

        let subMenu;
        if (!isEmpty(displaySpec.items)) {
            subMenu = buildMenuItems(displaySpec.items, record, gridModel, column, agParams);
        }

        const cssClasses = ['xh-grid-menu-option'];
        if (displaySpec.intent)
            cssClasses.push(`xh-grid-menu-option--intent-${displaySpec.intent}`);
        if (displaySpec.className) cssClasses.push(displaySpec.className);

        ret.push({
            menuItem: RecordActionMenuItem,
            menuItemParams: {
                displaySpec
            },
            // Standard MenuActionProps
            cssClasses,
            subMenu,
            tooltip: displaySpec.tooltip,
            disabled: displaySpec.disabled,
            // Don't specify action if no handler, allows submenus to remain open if clicked
            action: action.actionFn ? () => action.call(actionParams) : undefined
        });
    });

    return ret
        .filter(filterMenuHeadings(it => it?.menuItem === MenuHeadingItem))
        .filter(filterConsecutiveMenuSeparators());
}

/** Pre-process hoist tokens to RecordActions, leaving ag-Grid token in place. */
function replaceHoistToken(token: string, gridModel: GridModel): Some<RecordAction | string> {
    switch (token) {
        case '-':
            return 'separator';
        case 'autosizeColumns':
            return new RecordAction({
                text: 'Autosize Columns',
                icon: Icon.magic(),
                hidden: !gridModel?.autosizeEnabled,
                actionFn: () => gridModel.autosizeAsync({showMask: true})
            });
        case 'copyCell':
            return new RecordAction({
                text: 'Copy Cell',
                icon: Icon.copy(),
                hidden: !gridModel,
                recordsRequired: true,
                actionFn: ({record, column}) => {
                    if (record && column) {
                        const node = gridModel.agApi?.getRowNode(record.agId),
                            value = XH.gridExportService.getExportableValueForCell({
                                gridModel,
                                record,
                                column,
                                node
                            });
                        copyToClipboard(value);
                    }
                }
            });
        case 'colChooser':
            return new RecordAction({
                hidden: !gridModel.colChooserModel,
                displayFn: () => {
                    const chooser = gridModel.colChooserModel;
                    if (chooser?.mode !== 'docked') {
                        return {icon: Icon.gridPanel(), text: 'Columns...'};
                    }
                    // The dock is toggled in place, so reflect its current state.
                    const {isOpen} = chooser;
                    return {
                        icon: isOpen ? Icon.cross() : Icon.gridPanel(),
                        text: `${isOpen ? 'Close' : 'Open'} Columns Panel`
                    };
                },
                actionFn: () => {
                    const chooser = gridModel.colChooserModel;
                    chooser.mode === 'docked' ? chooser.toggle() : chooser.open();
                }
            });
        case 'expandCollapseAll': // For backward compatibility
        case 'expandCollapse':
            return createExpandCollapseItem(gridModel);
        case 'export':
        case 'exportExcel':
            return new RecordAction({
                text: 'Export to Excel',
                icon: Icon.fileExcel(),
                hidden: !gridModel?.enableExport,
                disabled: !gridModel?.store.count,
                actionFn: () => gridModel.exportAsync({type: 'excelTable'})
            });
        case 'exportCsv':
            return new RecordAction({
                text: 'Export to CSV',
                icon: Icon.file(),
                hidden: !gridModel?.enableExport,
                disabled: !gridModel?.store.count,
                actionFn: () => gridModel.exportAsync({type: 'csv'})
            });
        case 'exportLocal':
            return 'export';
        case 'filter': {
            const filterModel = gridModel?.filterModel;

            const getValues = (records, field) => {
                return uniq(records.map(rec => rec.get(field)));
            };

            const filterDisplayFn =
                op =>
                ({selectedRecords, record, column}) => {
                    if (isEmpty(selectedRecords) || !column?.filterable) return {hidden: true};

                    const {field} = column,
                        fieldSpec = filterModel.getFieldSpec(field);

                    if (!fieldSpec?.supportsOperator(op)) return {hidden: true};

                    const values = getValues(selectedRecords, field);
                    if (values.length > 1) return {text: `${values.length} values`};

                    const renderer = fieldSpec.renderer ?? column.renderer,
                        elem = renderer
                            ? renderer(values[0], {
                                  record,
                                  column,
                                  gridModel
                              })
                            : (values[0] ?? '[blank]');

                    return {text: elem};
                };

            return new RecordAction({
                text: 'Filter',
                icon: Icon.filter(),
                displayFn: ({column}) => {
                    return {
                        hidden:
                            !filterModel?.bind ||
                            !(filterModel.bind instanceof Store) ||
                            !filterModel.getFieldSpec(column?.field) ||
                            !column?.filterable
                    };
                },
                items: [
                    {
                        icon: Icon.equals(),
                        recordsRequired: true,
                        displayFn: filterDisplayFn('='),
                        actionFn: ({selectedRecords, column}) => {
                            const {field} = column,
                                value = getValues(selectedRecords, field);
                            filterModel.setColumnFilters(field, {field, op: '=', value});
                        }
                    },
                    {
                        icon: Icon.notEquals(),
                        recordsRequired: true,
                        displayFn: filterDisplayFn('!='),
                        actionFn: ({selectedRecords, column}) => {
                            const {field} = column,
                                value = getValues(selectedRecords, field);
                            filterModel.mergeColumnFilters(field, {field, op: '!=', value});
                        }
                    },
                    '-',
                    {
                        icon: Icon.delete(),
                        displayFn: ({column}) => {
                            const filters = filterModel.getColumnFilters(column.field),
                                text = `Clear ${column.displayName} Filters`;
                            return {text, disabled: isEmpty(filters)};
                        },
                        actionFn: ({column}) => {
                            filterModel.setColumnFilters(column.field, null);
                        }
                    },
                    {
                        text: 'View Grid Filters',
                        icon: Icon.code(),
                        actionFn: () => filterModel.openDialog()
                    }
                ]
            });
        }
        case 'restoreDefaults':
            return new RecordAction({
                text: 'Restore Grid Defaults',
                icon: Icon.reset(),
                actionFn: () => gridModel.restoreDefaultsAsync()
            });
        default:
            return token;
    }
}

function createExpandCollapseItem(gridModel: GridModel): RecordAction[] {
    if (!gridModel || gridModel.maxDepth === 0) return null;

    return [
        new RecordAction({
            text: 'Expand All',
            icon: Icon.groupRowExpanded(),
            actionFn: () => gridModel.expandAll()
        }),
        new RecordAction({
            text: 'Collapse All',
            icon: Icon.groupRowCollapsed(),
            actionFn: () => gridModel.collapseAll()
        }),
        levelExpandAction(gridModel)
    ];
}

function levelExpandAction(gridModel: GridModel): RecordAction {
    return new RecordAction({
        text: 'Expand to...',
        displayFn: () => {
            const {maxDepth, resolvedLevelLabels} = gridModel;

            // Don't show for flat grid models or if we don't have labels
            if (!maxDepth || !resolvedLevelLabels) return {hidden: true};

            const items = resolvedLevelLabels.map((label, idx) => {
                const isCurrLevel = gridModel.isCurrentExpandLevel(idx);

                return {
                    icon: isCurrLevel ? Icon.check() : null,
                    text: label,
                    actionFn: () => wait().then(() => gridModel.expandToLevel(idx))
                };
            });
            return {items};
        }
    });
}

/**
 * A MenuItem for a Hoist RecordAction.
 *
 * A variant of the standard ag-Grid Context menu.  Unlike built-in ag-Grid menu item,
 * provides support for specifying 'text' and 'shortcut' display as react elements.
 *
 * @internal
 */

interface RecordActionMenuItemProps extends HoistProps, CustomMenuItemProps {
    displaySpec: RecordActionSpec;
}

interface MenuHeadingItemProps extends HoistProps, CustomMenuItemProps {
    heading: RecordActionHeading;
}

/**
 * A non-interactive heading within an ag-Grid context menu.
 *
 * Mirrors the four-part cell structure of {@link RecordActionMenuItem} so that the rule each cell
 * draws spans the full menu width - the same approach ag-Grid takes for its own separators - and
 * so the row keeps the menu's column widths intact. The label sits in the text cell but is shifted
 * left in CSS to sit outside the item text, so it reads as a heading rather than an item.
 *
 * @internal
 */
const MenuHeadingItem = hoistCmp<MenuHeadingItemProps>({
    render({heading}: MenuHeadingItemProps) {
        useGridMenuItem({
            configureDefaults: () => ({
                suppressClick: true,
                suppressMouseDown: true,
                suppressMouseOver: true,
                suppressKeyboardSelect: true,
                suppressTabIndex: true,
                suppressFocus: true,
                suppressTooltip: true
            })
        });

        return div(
            span({className: 'ag-menu-option-part ag-menu-option-icon'}),
            span({
                className: 'ag-menu-option-part ag-menu-option-text',
                item: span({className: 'xh-grid-menu-heading__label', item: heading.heading})
            }),
            span({className: 'ag-menu-option-part ag-menu-option-shortcut'}),
            span({className: 'ag-menu-option-part ag-menu-option-popup-pointer'})
        );
    }
});

const RecordActionMenuItem = hoistCmp<RecordActionMenuItemProps>({
    render({displaySpec, subMenu}: RecordActionMenuItemProps) {
        useGridMenuItem({
            configureDefaults: () => true
        });

        return div(
            span({className: 'ag-menu-option-part ag-menu-option-icon', item: displaySpec.icon}),
            span({className: 'ag-menu-option-part ag-menu-option-text', item: displaySpec.text}),
            span({
                className: 'ag-menu-option-part ag-menu-option-shortcut',
                item: displaySpec.secondaryText
            }),
            span({
                className: 'ag-menu-option-part ag-menu-option-popup-pointer',
                item: subMenu
                    ? span({
                          className: 'ag-icon ag-icon-small-right',
                          unselectable: 'on',
                          role: 'presentation'
                      })
                    : ''
            })
        );
    }
});
