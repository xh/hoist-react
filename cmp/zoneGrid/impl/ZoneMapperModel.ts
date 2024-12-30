/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {HoistModel, XH} from '@xh/hoist/core';
import {span} from '@xh/hoist/cmp/layout';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {StoreRecord} from '@xh/hoist/data';
import {GridSorter} from '@xh/hoist/cmp/grid';
import {Icon} from '@xh/hoist/icon';
import {cloneDeep, findIndex, isBoolean, isEmpty, isEqual, isFinite, isString} from 'lodash';
import {ReactNode} from 'react';
import {ZoneGridModel} from '../ZoneGridModel';
import {ZoneField, Zone, ZoneLimit, ZoneMapping} from '../Types';

export interface ZoneMapperConfig {
    /** The ZoneGridModel to be configured. */
    zoneGridModel: ZoneGridModel;

    /** True (default) to show Reset button to restore default configuration. */
    showRestoreDefaults?: boolean;

    /** True (default) to group columns by their chooserGroup */
    groupColumns?: boolean;
}

/**
 * State management for the ZoneMapper component.
 *
 * It is not necessary to manually create instances of this class within an application.
 *
 * @internal
 */
export class ZoneMapperModel extends HoistModel {
    zoneGridModel: ZoneGridModel;
    showRestoreDefaults: boolean;
    groupColumns: boolean;

    // Show in dialog
    @observable isOpen: boolean = false;

    // Show in popover (desktop only)
    @observable isPopoverOpen = false;

    @bindable
    selectedZone: Zone = 'tl';

    @observable.ref
    mappings: Record<Zone, ZoneMapping[]>;

    @observable.ref
    sortBy: GridSorter;

    fields: ZoneField[] = [];
    sampleRecord: StoreRecord;

    @computed
    get isDirty(): boolean {
        const {mappings, sortBy} = this.zoneGridModel;
        return !isEqual(this.mappings, mappings) || !isEqual(this.sortBy, sortBy);
    }

    get leftFlex(): number {
        const ret = this.zoneGridModel.leftColumnSpec?.flex;
        return isBoolean(ret) ? 1 : (ret ?? 2);
    }

    get rightFlex(): number {
        const ret = this.zoneGridModel.rightColumnSpec?.flex;
        return isBoolean(ret) ? 1 : (ret ?? 1);
    }

    get limits(): Partial<Record<Zone, ZoneLimit>> {
        return this.zoneGridModel.limits;
    }

    get delimiter(): string | false {
        return this.zoneGridModel.delimiter;
    }

    get sortByColId() {
        return this.sortBy?.colId;
    }

    get sortByOptions() {
        return this.fields
            .filter(it => it.sortable)
            .map(it => {
                const {field, displayName} = it;
                return {value: field, label: displayName};
            });
    }

    constructor(config: ZoneMapperConfig) {
        super();
        makeObservable(this);

        const {zoneGridModel, showRestoreDefaults = true, groupColumns = true} = config;

        this.zoneGridModel = zoneGridModel;
        this.showRestoreDefaults = showRestoreDefaults;
        this.groupColumns = groupColumns;
        this.fields = this.getFields();

        this.addReaction({
            track: () => XH.routerState,
            run: () => this.close()
        });
    }

    async restoreDefaultsAsync() {
        const restored = await this.zoneGridModel.restoreDefaultsAsync();
        if (restored) this.close();
    }

    @action
    open() {
        this.syncMapperData();
        this.isOpen = true;
    }

    @action
    openPopover() {
        this.syncMapperData();
        this.isPopoverOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
        this.isPopoverOpen = false;
    }

    commit() {
        this.zoneGridModel.setMappings(this.mappings);
        this.zoneGridModel.setSortBy(this.sortBy);
    }

    getSamplesForZone(zone: Zone): ReactNode[] {
        return this.mappings[zone].map((mapping, index) => {
            return this.getSampleForMapping(mapping, this.isZoneTopRow(zone) && index === 0);
        });
    }

    getSortLabel() {
        const {sortBy} = this;
        if (!sortBy) return null;
        if (sortBy.abs) return 'Abs';
        return sortBy.sort === 'asc' ? 'Asc' : 'Desc';
    }

    getSortIcon() {
        const {sortBy} = this;
        if (!sortBy) return null;
        const {abs, sort} = sortBy;
        if (sort === 'asc') {
            return abs ? Icon.sortAbsAsc() : Icon.sortAsc();
        } else if (sort === 'desc') {
            return abs ? Icon.sortAbsDesc() : Icon.sortDesc();
        }
    }

    //------------------------
    // Sorting
    //------------------------
    @action
    setSortByColId(colId: string) {
        const {sortingOrder} = this.fields.find(it => it.field === colId);

        // Default direction|abs to first entry in sortingOrder
        this.sortBy = GridSorter.parse({colId, ...sortingOrder[0]});
    }

    @action
    setNextSortBy() {
        const {colId, sort, abs} = this.sortBy,
            {sortingOrder} = this.fields.find(it => it.field === colId),
            currIdx = findIndex(sortingOrder, {sort, abs}),
            nextIdx = isFinite(currIdx) ? (currIdx + 1) % sortingOrder.length : 0;

        this.sortBy = GridSorter.parse({colId, ...sortingOrder[nextIdx]});
    }

    //------------------------
    // Zone Mappings
    //------------------------
    toggleShown(field: string) {
        const {selectedZone} = this,
            currMapping = this.getMappingForFieldAndZone(selectedZone, field);

        if (currMapping) {
            this.removeZoneMapping(selectedZone, field);
        } else {
            this.addZoneMapping(selectedZone, field);
        }
    }

    toggleShowLabel(field: string) {
        const {selectedZone} = this,
            currMapping = this.getMappingForFieldAndZone(selectedZone, field);

        this.addOrAdjustZoneMapping(selectedZone, field, {
            showLabel: !currMapping?.showLabel
        });
    }

    @action
    private syncMapperData() {
        // Copy latest mappings and sortBy from grid
        const {mappings, sortBy} = this.zoneGridModel;
        this.mappings = cloneDeep(mappings);
        this.sortBy = sortBy ? cloneDeep(sortBy) : null;

        // Take sample record from grid
        this.sampleRecord = this.getSampleRecord();
    }

    private getFields(): ZoneField[] {
        const {zoneGridModel} = this;
        return zoneGridModel.availableColumns.map(it => {
            const fieldName = isString(it.field) ? it.field : it.field.name,
                column = zoneGridModel.gridModel.getColumn(fieldName),
                displayName = column.displayName,
                label = isString(it.headerName) ? it.headerName : displayName;

            return {
                field: fieldName,
                displayName: displayName,
                label: label,
                column: column,
                renderer: column.renderer,
                chooserGroup: column.chooserGroup,
                sortable: column.sortable,
                sortingOrder: column.sortingOrder
            };
        });
    }

    private addOrAdjustZoneMapping(zone: Zone, field: string, adjustment: Partial<ZoneMapping>) {
        const currMapping = this.getMappingForFieldAndZone(zone, field);
        if (currMapping) {
            this.adjustZoneMapping(zone, field, adjustment);
        } else {
            this.addZoneMapping(zone, field, adjustment);
        }
    }

    @action
    private adjustZoneMapping(zone: Zone, field: string, adjustment: Partial<ZoneMapping>) {
        const currMapping = this.getMappingForFieldAndZone(zone, field);
        if (!currMapping) return;

        let mappings = cloneDeep(this.mappings);
        mappings[zone] = mappings[zone].map(it => {
            return it.field === field ? {...it, ...adjustment} : it;
        });
        this.mappings = mappings;
    }

    @action
    private addZoneMapping(zone: Zone, field: string, config: Partial<ZoneMapping> = {}) {
        const allowedFields = this.limits?.[zone]?.only,
            maxFields = this.limits?.[zone]?.max;

        if (!isEmpty(allowedFields) && !allowedFields.includes(field)) return;

        let mappings = cloneDeep(this.mappings);

        // Drop the last (right-most) value(s) as needed to ensure we don't overflow max
        const zoneCount = mappings[zone].length;
        if (maxFields && zoneCount >= maxFields) {
            mappings[zone].splice(zoneCount - 1, zoneCount - maxFields + 1);
        }

        // Add the new mapping
        mappings[zone].push({...config, field});
        this.mappings = mappings;
    }

    private removeZoneMapping(zone: Zone, field: string) {
        let mappings = cloneDeep(this.mappings);
        mappings[zone] = mappings[zone].filter(it => it.field !== field);

        const minFields = this.limits?.[zone]?.min;
        if (!minFields || mappings[zone].length >= minFields) {
            this.mappings = mappings;
        }
    }

    private getMappingForFieldAndZone(zone: Zone, field: string): ZoneMapping {
        return this.mappings[zone].find(it => it.field === field);
    }

    private isZoneTopRow(zone: Zone) {
        return new Array<Zone>('tl', 'tr').includes(zone);
    }

    //------------------------
    // Sample Display
    //------------------------
    getSampleForMapping(mapping: ZoneMapping, ignoreLabel: boolean): ReactNode {
        const {fields, sampleRecord} = this,
            field = fields.find(it => it.field === mapping.field);

        if (!field) return null;

        let value;
        if (sampleRecord) {
            value = sampleRecord.data[mapping.field];
            if (field.renderer) {
                value = field.renderer(value, {
                    record: sampleRecord,
                    column: field.column,
                    gridModel: this.zoneGridModel.gridModel
                });
            }
        }

        // Display a placeholder if the sample record is missing a value for the field
        if (isEmpty(value)) {
            return span(`[${field.displayName}]`);
        }

        // Render label if requested
        const label = mapping.showLabel && !ignoreLabel ? `${field.label}: ` : null;
        return span(label, value);
    }

    private getSampleRecord(): StoreRecord {
        // Iterate down to a (likely more fully populated) leaf record.
        let ret = this.zoneGridModel.store.records[0];
        while (ret && !isEmpty(ret.children)) {
            ret = ret.children[0];
        }
        return ret;
    }
}
