/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {Some, XH} from '@xh/hoist/core';
import {GridModel} from '@xh/hoist/cmp/grid';
import {RecordAction, RecordActionLike} from '@xh/hoist/data';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import copy from 'clipboard-copy';
import {flatten, isEmpty, isString, uniq} from 'lodash';
import {isValidElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

export interface StoreContextMenuSpec {
    items?: StoreContextMenuItemLike[];

    /**
     * GridModel to bind to this contextMenu, used to enable implementation
     * of menu items / tokens above.
     */
    gridModel?: GridModel;
}

/**
 * If a String, value can be '-' for a separator, or a token supported by ag-Grid
 * for its native menu items.
 * @link https://www.ag-grid.com/javascript-grid-context-menu/#built-in-menu-items
 */
export type StoreContextMenuItemLike = RecordActionLike|StoreContextMenuToken|string;

/**
 * Hoist tokens, all of which require a GridModel:
 *          `autosizeColumns` - autosize columns to fit their contents.
 *          `copyCell` - copy cell value to clipboard.
 *          `colChooser` - display column chooser for a grid.
 *          `expandCollapseAll` - expand/collapse all parent rows on grouped or tree grid.
 *          `export` - export grid data to excel via Hoist's server-side export capabilities.
 *          `exportExcel` - alias for `export`.
 *          `exportCsv` - export to CSV via Hoist's server-side export capabilities.
 *          `exportLocal` - export to Excel via ag-Grid's built-in client side export.
 *          'filter' - Sub menu to filter grid. Requires grid filtering.
 *          `restoreDefaults` - restore column, sorting, and grouping configs and clear any
 *              persistent grid state. {@see GridModel.restoreDefaults}
 */
export type StoreContextMenuToken = 'autosizeColumns'|'copyCell'|'colChooser'|'expandCollapseAll'|
    'export'|'exportExcel'|'exportCsv'|'exportLocal'|'filter'|'restoreDefaults';

/**
 * Model for ContextMenus interacting with data provided by Hoist data stores, typically via a Grid.
 * @see GridModel.contextMenu
 */
export class StoreContextMenu {

    items: (RecordAction|string)[] = [];
    gridModel: GridModel = null;

    constructor({items, gridModel}: StoreContextMenuSpec) {
        this.gridModel = gridModel;
        this.items = flatten(items.map(it => this.buildRecordAction(it)));
    }

    buildRecordAction(item: StoreContextMenuItemLike): Some<RecordAction|string> {
        if (isString(item)) return this.parseToken(item);

        const ret = item instanceof RecordAction ? item : new RecordAction(item);
        if (!isEmpty(ret.items)) {
            ret.items = ret.items.map(it => this.buildRecordAction(it)) as RecordAction[];
        }
        return ret;
    }

    parseToken(token: StoreContextMenuToken|string): Some<RecordAction|string> {
        const {gridModel} = this;

        // Export tokens are currently only supported on desktop devices.
        if (!XH.isDesktop && token.startsWith('export')) return;

        if (token === 'autoSizeColumns') {
            console.warn('StoreContextMenu token `autoSizeColumns` has been deprecated. Use `autosizeColumns` instead.');
            token = 'autosizeColumns';
        }

        switch (token) {
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
                    actionFn: () => gridModel.colChooserModel.open()
                });
            case 'expandCollapseAll':
                return [
                    new RecordAction({
                        text: 'Expand All',
                        icon: Icon.angleDown(),
                        hidden: !gridModel || (!gridModel.treeMode && isEmpty(gridModel.groupBy)),
                        actionFn: () => gridModel.expandAll()
                    }),
                    new RecordAction({
                        text: 'Collapse All',
                        icon: Icon.angleRight(),
                        hidden: !gridModel || (!gridModel.treeMode && isEmpty(gridModel.groupBy)),
                        actionFn: () => gridModel.collapseAll()
                    })
                ];
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

                const filterDisplayFn = (op) => ({selectedRecords, record, column}) => {
                    if (isEmpty(selectedRecords) || !column?.filterable) return {hidden: true};

                    const {field} = column,
                        fieldSpec = filterModel.getFieldSpec(field);

                    if (!fieldSpec?.supportsOperator(op)) return {hidden: true};

                    const values = getValues(selectedRecords, field);
                    if (values.length > 1) return {text: `${values.length} values`};

                    const renderer = fieldSpec.renderer ?? column.renderer,
                        elem = renderer ? renderer(values[0], {record, column, gridModel}) : values[0] ?? '[blank]',
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
                            hidden: (
                                !filterModel?.bind.isStore ||
                                !filterModel.getFieldSpec(column?.field) ||
                                !column?.filterable
                            )
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
}
