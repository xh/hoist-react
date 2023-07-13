/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {div} from '@xh/hoist/cmp/layout';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {StoreConfig} from '@xh/hoist/data';
import {Icon} from '@xh/hoist/icon';
import {computed, makeObservable} from '@xh/hoist/mobx';

/**
 * A Model for managing the state of a LeftRightChooser.
 */
export class LeftRightChooserModel extends HoistModel {
    @managed leftModel: GridModel;

    @managed rightModel: GridModel;

    onChange: () => any;

    hasDescription = false;
    leftGroupingEnabled = false;
    rightGroupingEnabled = false;
    leftGroupingExpanded = false;
    rightGroupingExpanded = false;

    private hasGrouping = null;
    private ungroupedName = null;
    private data = null;
    private lastSelectedSide = null;

    /**
     * Filter for data rows to determine if they should be shown.
     * Useful for helping users find values of interest in a large pool of rows.
     *
     * Note that this will *not* affect the actual 'value' property, which will continue
     * to include unfiltered records.
     *
     * @see LeftRightChooserFilter - a component to easily control this field.
     * @param {function} fn - predicate function for filtering.
     */
    setDisplayFilter(fn) {
        const filter = fn ? {key: this.xhId, testFn: fn} : null;
        this.leftModel.store.setFilter(filter);
        this.rightModel.store.setFilter(filter);
    }

    /** Currently 'selected' values on the right-hand side. */
    @computed
    get rightValues() {
        return this.rightModel.store.allRecords.map(it => it.data.value);
    }

    /** Currently 'selected' values on the left-hand side. */
    @computed
    get leftValues() {
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
        rightTitle = 'Selected',
        rightSorted = false,
        rightGroupingEnabled = true,
        rightGroupingExpanded = true,
        rightEmptyText = null,
        showCounts = true,
        xhImpl = false
    }) {
        super();
        makeObservable(this);
        this.xhImpl = xhImpl;

        this.onChange = onChange;
        this.ungroupedName = ungroupedName;
        this.leftGroupingEnabled = leftGroupingEnabled;
        this.rightGroupingEnabled = rightGroupingEnabled;
        this.leftGroupingExpanded = leftGroupingExpanded;
        this.rightGroupingExpanded = rightGroupingExpanded;

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

        const leftTextCol = {
                field: 'text',
                flex: true,
                headerName: () =>
                    leftTitle + (showCounts ? ` (${this.leftModel.store.count})` : ''),
                renderer: this.getTextColRenderer('left')
            },
            rightTextCol = {
                field: 'text',
                flex: true,
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
            xhImpl: true
        });

        this.rightModel = new GridModel({
            store,
            selModel: 'multiple',
            sortBy: rightSorted ? 'text' : null,
            emptyText: rightEmptyText,
            onRowDoubleClicked: e => this.onRowDoubleClicked(e),
            columns: [rightTextCol, groupCol],
            xhImpl: true
        });

        this.setData(data);

        this.addReaction(this.syncSelectionReaction());
    }

    setData(data) {
        const hasGrouping = data.some(it => it.group),
            lhGroupBy = this.leftGroupingEnabled && hasGrouping ? 'group' : null,
            rhGroupBy = this.rightGroupingEnabled && hasGrouping ? 'group' : null;

        this.hasDescription = data.some(it => it.description);
        this.leftModel.setGroupBy(lhGroupBy);
        this.rightModel.setGroupBy(rhGroupBy);

        this.data = this.preprocessData(data);
        this.hasGrouping = hasGrouping;
        this.refreshStores();
    }

    //------------------------
    // Implementation
    //------------------------
    getTextColRenderer(side) {
        const groupingEnabled =
                side === 'left' ? this.leftGroupingEnabled : this.rightGroupingEnabled,
            lockSvg = Icon.lock({prefix: 'fal'});

        return (v, {record}) => {
            const groupClass =
                groupingEnabled && this.hasGrouping ? 'xh-lr-chooser__group-row' : '';
            return div({
                className: `xh-lr-chooser__item-row ${groupClass}`,
                items: [v, record.data.locked ? lockSvg : null]
            });
        };
    }

    preprocessData(data) {
        return data
            .filter(r => !r.exclude)
            .map(r => {
                return {
                    id: XH.genId(),
                    group: this.ungroupedName,
                    side: 'left',
                    ...r
                };
            });
    }

    onRowDoubleClicked(e) {
        if (e.data) this.moveRows([e.data]);
    }

    moveRows(rows) {
        rows.forEach(rec => {
            const {locked, side} = rec.data;
            if (locked) return;
            rec.raw.side = side === 'left' ? 'right' : 'left';
        });

        this.refreshStores();
        if (this.onChange) this.onChange();
    }

    syncSelectionReaction() {
        const leftSel = this.leftModel.selModel,
            rightSel = this.rightModel.selModel;

        return {
            track: () => [leftSel.selectedRecord, rightSel.selectedRecord],
            run: () => {
                const lastSelectedSide = this.lastSelectedSide;
                if (leftSel.selectedRecord && lastSelectedSide !== 'left') {
                    this.lastSelectedSide = 'left';
                    rightSel.clear();
                } else if (rightSel.selectedRecord && lastSelectedSide !== 'right') {
                    this.lastSelectedSide = 'right';
                    leftSel.clear();
                }
            }
        };
    }

    refreshStores() {
        const data = this.data,
            {leftModel, rightModel} = this;

        leftModel.store.loadData(data.filter(it => it.side === 'left'));
        rightModel.store.loadData(data.filter(it => it.side === 'right'));
    }
}
