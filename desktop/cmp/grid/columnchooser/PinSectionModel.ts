import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, managed} from '@xh/hoist/core';
import type {HSide} from '@xh/hoist/core';
import {Icon} from '@xh/hoist/icon';
import {makeObservable} from '@xh/hoist/mobx';
import type {ColumnChooserRecord} from './ColumnChooserModel';

/**
 * @internal
 * Model for a single pin zone within the ColumnChooser.
 * Each zone (left-pinned, center, right-pinned) has its own PinSectionModel.
 */
export class PinSectionModel extends HoistModel {
    override xhImpl = true;

    /** Which pin zone: 'left', null (center), or 'right'. */
    pinned: HSide;

    @managed
    gridModel: GridModel;

    /** Callback set by ColumnChooserModel for visibility toggling. */
    onToggleVisibility: (recordId: string) => void;

    constructor({pinned}: {pinned: HSide}) {
        super();
        makeObservable(this);
        this.pinned = pinned;

        this.gridModel = new GridModel({
            store: {
                idSpec: 'id',
                fields: [
                    {name: 'name', type: 'string'},
                    {name: 'description', type: 'string'},
                    {name: 'visible', type: 'bool'},
                    {name: 'isGroup', type: 'bool'},
                    {name: 'hideable', type: 'bool'},
                    {name: 'parentId', type: 'string'},
                    {name: 'sortOrder', type: 'int'},
                    {name: 'leafColIds', type: 'json'}
                ]
            },
            emptyText: 'No columns',
            selModel: 'single',
            sortBy: 'sortOrder',
            hideHeaders: true,
            onCellClicked: e => {
                if (e.column?.getColId() === 'visible') {
                    this.onToggleVisibility?.(e.data.id);
                }
            },
            columns: [
                {
                    colId: 'visible',
                    headerName: '',
                    width: 40,
                    align: 'center',
                    renderer: (v, {record}) => {
                        if (!record.data.hideable) return Icon.lock();
                        return v ? Icon.checkSquare() : Icon.square();
                    }
                },
                {
                    colId: 'name',
                    headerName: 'Column',
                    flex: 1
                }
            ]
        });
    }

    /** Load records for this pin zone. */
    loadRecords(records: ColumnChooserRecord[]) {
        const filtered = records.filter(r => {
            if (r.isGroup) return true;
            return (r.pinned ?? null) === (this.pinned ?? null);
        });
        // Also filter out groups that have no leaf children in this zone
        const leafIds = new Set(filtered.filter(r => !r.isGroup).map(r => r.id));
        const finalRecords = filtered.filter(r => {
            if (!r.isGroup) return true;
            return r.leafColIds.some(id => leafIds.has(id));
        });
        this.gridModel.store.loadData(finalRecords);
    }
}
