/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {HoistModel, HSide, managed, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {Icon} from '@xh/hoist/icon';
import {bindable, computed, makeObservable} from '@xh/hoist/mobx';
import {FilterTestFn, StoreConfig, StoreRecord} from '@xh/hoist/data';

export interface LeftRightChooserConfig {
    data?: LeftRightChooserItem[];

    /** True to globally prevent the user from moving items between sides. */
    readonly?: boolean;

    /** Callback for when items change sides. */
    onChange?: () => void;

    /** Placeholder group value when an item has no group. */
    ungroupedName?: string;

    /** True to display the count of items on each side in the header. */
    showCounts?: boolean;

    leftTitle?: string;
    leftSorted?: boolean;
    leftGroupingEnabled?: boolean;
    leftGroupingExpanded?: boolean;
    leftEmptyText?: string;

    rightTitle?: string;
    rightSorted?: boolean;
    rightGroupingEnabled?: boolean;
    rightGroupingExpanded?: boolean;
    rightEmptyText?: string;

    xhImpl?: boolean;
}

/** Data record object for a LeftRightChooser value item. */
export interface LeftRightChooserItem {
    /** Primary label for the item. */
    text: string;

    /** Value that the item represents. */
    value: any;

    /** User-friendly, longer description of the item. */
    description?: string;

    /** Grid group in which to show the item. */
    group?: string;

    /** Initial side of the item - default 'left'. */
    side?: HSide;

    /** True to prevent the user from moving the item between sides. */
    locked?: boolean;

    /* True to exclude the item from the chooser entirely. */
    exclude?: boolean;
}

/**
 * A Model for managing the state of a LeftRightChooser.
 */
export class LeftRightChooserModel extends HoistModel {
    @managed leftModel: GridModel;
    @managed rightModel: GridModel;

    @bindable readonly = false;

    onChange: () => void;

    hasDescription: boolean;
    leftGroupingEnabled: boolean;
    rightGroupingEnabled: boolean;
    leftGroupingExpanded: boolean;
    rightGroupingExpanded: boolean;

    private _hasGrouping: boolean;
    private _ungroupedName: string;
    private _data: LeftRightChooserItem[];
    private _lastSelectedSide: HSide;

    /**
     * Filter for data rows to determine if they should be shown.
     * Useful for helping users find values of interest in a large pool of rows.
     *
     * Note that this will *not* affect the actual 'value' property, which will continue
     * to include unfiltered records.
     *
     * @see LeftRightChooserFilter - a component to easily control this field.
     * @param fn - predicate function for filtering.
     */
    setDisplayFilter(fn: FilterTestFn) {
        const filter = fn ? {key: this.xhId, testFn: fn} : null;
        this.leftModel.store.setFilter(filter);
        this.rightModel.store.setFilter(filter);
    }

    /** Currently 'selected' values on the right hand side. */
    @computed
    get rightValues(): any[] {
        return this.rightModel.store.allRecords.map(it => it.data.value);
    }

    /** Currently 'selected' values on the left hand side. */
    @computed
    get leftValues(): any[] {
        return this.leftModel.store.allRecords.map(it => it.data.value);
    }

    constructor({
        data = [],
        onChange,
        ungroupedName = 'Ungrouped',
        leftTitle = 'Available',
        leftSorted = false,
        leftGroupingEnabled = true,
        leftGroupingExpanded = true,
        leftEmptyText = null,
        readonly = false,
        rightTitle = 'Selected',
        rightSorted = false,
        rightGroupingEnabled = true,
        rightGroupingExpanded = true,
        rightEmptyText = null,
        showCounts = true,
        xhImpl = false
    }: LeftRightChooserConfig) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        this.onChange = onChange;
        this._ungroupedName = ungroupedName;
        this.leftGroupingEnabled = leftGroupingEnabled;
        this.rightGroupingEnabled = rightGroupingEnabled;
        this.leftGroupingExpanded = leftGroupingExpanded;
        this.rightGroupingExpanded = rightGroupingExpanded;
        this.readonly = readonly;

        const store: StoreConfig = {
            fields: [
                {name: 'text', type: 'string'},
                {name: 'value', type: 'string'},
                {name: 'description', type: 'string'},
                {name: 'group', type: 'string'},
                {name: 'side', type: 'string'},
                {name: 'locked', type: 'bool'},
                {name: 'exclude', type: 'bool'}
            ]
        };

        const colSpec = {
                field: 'text',
                flex: true,
                resizable: true
            },
            leftTextCol = {
                ...colSpec,
                headerName: () =>
                    leftTitle + (showCounts ? ` (${this.leftModel.store.count})` : ''),
                renderer: this.getTextColRenderer('left')
            },
            rightTextCol = {
                ...colSpec,
                headerName: () =>
                    rightTitle + (showCounts ? ` (${this.rightModel.store.count})` : ''),
                renderer: this.getTextColRenderer('right')
            },
            groupCol = {
                field: 'group',
                headerName: 'Group',
                hidden: true
            };

        this.leftModel = new GridModel({
            store,
            selModel: 'multiple',
            sortBy: leftSorted ? 'text' : null,
            emptyText: leftEmptyText,
            onRowDoubleClicked: e => this.onRowDoubleClicked(e),
            columns: [leftTextCol, groupCol],
            contextMenu: false,
            expandToLevel: leftGroupingExpanded ? 1 : 0,
            xhImpl: true
        });

        this.rightModel = new GridModel({
            store,
            selModel: 'multiple',
            sortBy: rightSorted ? 'text' : null,
            emptyText: rightEmptyText,
            onRowDoubleClicked: e => this.onRowDoubleClicked(e),
            columns: [rightTextCol, groupCol],
            contextMenu: false,
            expandToLevel: rightGroupingExpanded ? 1 : 0,
            xhImpl: true
        });

        this.setData(data);

        this.addReaction(this.syncSelectionReaction());
    }

    setData(data: LeftRightChooserItem[]) {
        const hasGrouping = data.some(it => it.group),
            lhGroupBy = this.leftGroupingEnabled && hasGrouping ? 'group' : null,
            rhGroupBy = this.rightGroupingEnabled && hasGrouping ? 'group' : null;

        this.hasDescription = data.some(it => it.description);
        this.leftModel.setGroupBy(lhGroupBy);
        this.rightModel.setGroupBy(rhGroupBy);

        this._data = this.preprocessData(data);
        this._hasGrouping = hasGrouping;
        this.refreshStores();
    }

    moveRows(rows: StoreRecord[]) {
        rows.forEach(rec => {
            const {locked, side} = rec.data;
            if (locked || this.readonly) return;
            rec.raw.side = side === 'left' ? 'right' : 'left';
        });

        this.refreshStores();
        this.onChange?.();
    }

    //------------------------
    // Implementation
    //------------------------
    private getTextColRenderer(side: HSide) {
        const groupingEnabled =
                side === 'left' ? this.leftGroupingEnabled : this.rightGroupingEnabled,
            lockSvg = Icon.lock({prefix: 'fal'});

        return (v, {record}) => {
            const groupClass =
                groupingEnabled && this._hasGrouping ? 'xh-lr-chooser__group-row' : '';
            return div({
                className: `xh-lr-chooser__item-row ${groupClass}`,
                items: [v, record.data.locked ? lockSvg : null]
            });
        };
    }

    private preprocessData(data) {
        return data
            .filter(r => !r.exclude)
            .map(r => {
                return {
                    id: XH.genId(),
                    group: this._ungroupedName,
                    side: 'left',
                    ...r
                };
            });
    }

    private onRowDoubleClicked(e) {
        if (e.data) this.moveRows([e.data]);
    }

    private syncSelectionReaction() {
        const leftSel = this.leftModel.selModel,
            rightSel = this.rightModel.selModel;

        return {
            track: () => [leftSel.selectedRecord, rightSel.selectedRecord],
            run: () => {
                const lastSelectedSide = this._lastSelectedSide;
                if (leftSel.selectedRecord && lastSelectedSide !== 'left') {
                    this._lastSelectedSide = 'left';
                    rightSel.clear();
                } else if (rightSel.selectedRecord && lastSelectedSide !== 'right') {
                    this._lastSelectedSide = 'right';
                    leftSel.clear();
                }
            }
        };
    }

    private refreshStores() {
        const data = this._data,
            {leftModel, rightModel} = this;

        leftModel.store.loadData(data.filter(it => it.side === 'left'));
        rightModel.store.loadData(data.filter(it => it.side === 'right'));
    }
}
