/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {Some, XH} from '@xh/hoist/core';
import {Column, GridModel} from '@xh/hoist/cmp/grid';
import {RecordAction, Store, StoreRecord} from '@xh/hoist/data';
import {convertIconToHtml, Icon} from '@xh/hoist/icon';
import {filterConsecutiveMenuSeparators} from '@xh/hoist/utils/impl';
import copy from 'clipboard-copy';
import {isEmpty, isFunction, isNil, isString, uniq} from 'lodash';
import {isValidElement} from 'react';
import {renderToStaticMarkup} from '@xh/hoist/utils/react';
import {GridContextMenuItemLike, GridContextMenuSpec} from '../GridContextMenu';

import type {GetContextMenuItemsParams, MenuItemDef} from '@xh/hoist/kit/ag-grid';

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
    // Transform to actions or ag-Grid ready strings.
    const actions: Array<RecordAction | string> = menuItems.flatMap(it => {
        if (isString(it)) return replaceHoistToken(it, gridModel);
        if (it instanceof RecordAction) return it;
        return new RecordAction(it);
    });

    const ret = [];
    actions.forEach(action => {
        if (isNil(action)) return;

        if (isString(action)) {
            ret.push(action);
            return;
        }

        const actionParams = {
            record,
            selectedRecords: gridModel.selectedRecords,
            gridModel,
            column,
            agParams
        };

        const displaySpec = action.getDisplaySpec(actionParams);
        if (displaySpec.hidden) return;

        let subMenu;
        if (!isEmpty(displaySpec.items)) {
            subMenu = buildMenuItems(displaySpec.items, record, gridModel, column, agParams);
        }

        const icon = isValidElement(displaySpec.icon) ? convertIconToHtml(displaySpec.icon) : null;

        const cssClasses = ['xh-grid-menu-option'];
        if (displaySpec.intent)
            cssClasses.push(`xh-grid-menu-option--intent-${displaySpec.intent}`);
        if (displaySpec.className) cssClasses.push(displaySpec.className);

        ret.push({
            name: displaySpec.text,
            shortcut: displaySpec.secondaryText,
            icon,
            cssClasses,
            subMenu,
            tooltip: displaySpec.tooltip,
            disabled: displaySpec.disabled,
            // Avoid specifying action if no handler, allows submenus to remain open if accidentally clicked
            action: action.actionFn ? () => action.call(actionParams) : undefined
        });
    });

    return ret.filter(filterConsecutiveMenuSeparators());
}

/** Pre-process hoist tokens to RecordActions, leaving ag-Grid token in place. **/
function replaceHoistToken(token: string, gridModel: GridModel): Some<RecordAction | string> {
    switch (token) {
        case '-':
            return 'separator';
        case 'autosizeColumns':
            return new RecordAction({
                text: 'Autosize Columns',
                icon: Icon.arrowsLeftRight(),
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
                        copy(value);
                    }
                }
            });
        case 'colChooser':
            return new RecordAction({
                text: 'Columns...',
                icon: Icon.gridPanel(),
                hidden: !gridModel?.colChooserModel,
                actionFn: () => gridModel.colChooserModel?.open()
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
                            : (values[0] ?? '[blank]'),
                        // Grid col renderers will very typically return elements, but we need this to be a string.
                        // That's the contract for `RecordAction.text`, but even more importantly, we end up piping
                        // those actions into Ag-Grid context menus, which *only* accept strings / HTML markup
                        // and *not* ReactElements (as of AG v28.2).
                        text = isValidElement(elem) ? renderToStaticMarkup(elem) : elem;

                    return {text};
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
        text: 'Expand to ...',
        displayFn: () => {
            const {maxDepth, expandLevel, resolvedLevelLabels} = gridModel;

            // Don't show for flat grid models or if we don't have labels
            if (!maxDepth || !resolvedLevelLabels) return {hidden: true};

            const items = resolvedLevelLabels.map((label, idx) => {
                const isCurrLevel =
                    expandLevel === idx ||
                    (expandLevel > maxDepth && idx === resolvedLevelLabels.length - 1);

                return {
                    icon: isCurrLevel ? Icon.check() : null,
                    text: label,
                    actionFn: () => gridModel.expandToLevel(idx)
                };
            });
            return {items};
        }
    });
}
