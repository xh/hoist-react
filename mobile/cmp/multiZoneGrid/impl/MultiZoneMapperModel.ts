/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2023 Extremely Heavy Industries Inc.
 */
import '@xh/hoist/mobile/register';
import {HoistModel, managed, XH} from '@xh/hoist/core';
import {span} from '@xh/hoist/cmp/layout';
import {action, bindable, computed, makeObservable, observable} from '@xh/hoist/mobx';
import {StoreRecord} from '@xh/hoist/data';
import {Column, ColumnRenderer, GridModel} from '@xh/hoist/cmp/grid';
import {checkbox} from '@xh/hoist/mobile/cmp/input';
import {wait} from '@xh/hoist/promise';
import {cloneDeep, isBoolean, isEmpty, isEqual, isString} from 'lodash';
import {ReactNode} from 'react';
import {MultiZoneGridModel} from '../MultiZoneGridModel';
import {Zone, ZoneLimit, ZoneMapping} from '../Types';

export interface MultiZoneMapperConfig {
    /** The MultiZoneGridModel to be configured. */
    multiZoneGridModel: MultiZoneGridModel;

    /** True (default) to show Reset button to restore default configuration. */
    showRestoreDefaults?: boolean;

    /** True (default) to group columns by their chooserGroup */
    groupColumns?: boolean;
}

/**
 * State management for the MultiZoneMapper component.
 *
 * It is not necessary to manually create instances of this class within an application.
 * @internal
 */
export class MultiZoneMapperModel extends HoistModel {
    multiZoneGridModel: MultiZoneGridModel;
    showRestoreDefaults: boolean;
    groupColumns: boolean;

    @managed
    gridModel: GridModel;

    @observable
    isOpen: boolean = false;

    @bindable
    selectedZone: Zone = 'tl';

    @observable.ref
    mappings: Record<Zone, ZoneMapping[]>;

    fields: MapperField[] = [];
    sampleRecord: StoreRecord;

    @computed
    get isDirty(): boolean {
        return !isEqual(this.mappings, this.multiZoneGridModel.mappings);
    }

    get leftFlex(): number {
        const ret = this.multiZoneGridModel.leftColumnSpec?.flex;
        return isBoolean(ret) ? 1 : ret ?? 2;
    }

    get rightFlex(): number {
        const ret = this.multiZoneGridModel.rightColumnSpec?.flex;
        return isBoolean(ret) ? 1 : ret ?? 1;
    }

    get limits(): Partial<Record<Zone, ZoneLimit>> {
        return this.multiZoneGridModel.limits;
    }

    get delimiter(): string {
        return this.multiZoneGridModel.delimiter;
    }

    constructor(config: MultiZoneMapperConfig) {
        super();
        makeObservable(this);

        const {multiZoneGridModel, showRestoreDefaults = true, groupColumns = true} = config;

        this.multiZoneGridModel = multiZoneGridModel;
        this.showRestoreDefaults = showRestoreDefaults;
        this.groupColumns = groupColumns;

        this.fields = this.getFields();
        this.gridModel = this.createGridModel();

        this.addReaction(
            {
                track: () => this.selectedZone,
                run: () => this.syncMapperDataForZone()
            },
            {
                track: () => XH.routerState,
                run: this.close
            }
        );
    }

    async restoreDefaultsAsync() {
        const restored = await this.multiZoneGridModel.restoreDefaultsAsync();
        if (restored) this.close();
    }

    @action
    open() {
        this.syncMapperData();
        this.isOpen = true;
    }

    @action
    close() {
        this.isOpen = false;
    }

    commit() {
        this.multiZoneGridModel.setMappings(this.mappings);
    }

    getSamplesForZone(zone: Zone): ReactNode[] {
        return this.mappings[zone].map(mapping => {
            return this.getSampleForMapping(mapping);
        });
    }

    //------------------------
    // Zone Mappings
    //------------------------
    private getFields(): MapperField[] {
        const {multiZoneGridModel} = this;
        return multiZoneGridModel.availableColumns.map(it => {
            const fieldName = isString(it.field) ? it.field : it.field.name,
                column = multiZoneGridModel.gridModel.getColumn(fieldName),
                displayName = multiZoneGridModel.getDisplayName(fieldName),
                label = isString(it.headerName) ? it.headerName : displayName;

            return {
                field: fieldName,
                displayName: displayName,
                label: label,
                column: column,
                renderer: column.renderer,
                chooserGroup: column.chooserGroup
            };
        });
    }

    private createGridModel(): GridModel {
        const {groupColumns, fields} = this,
            hasGrouping = groupColumns && fields.some(it => it.chooserGroup);

        return new GridModel({
            store: {idSpec: 'field'},
            groupBy: hasGrouping ? 'chooserGroup' : null,
            columns: [
                {
                    field: 'displayName',
                    headerName: 'Field',
                    flex: 1
                },
                {
                    field: 'show',
                    align: 'center',
                    renderer: (value, {record}) => {
                        const {field} = record.data;
                        return checkbox({value, onChange: () => this.toggleShown(field)});
                    }
                },
                {
                    field: 'label',
                    align: 'center',
                    renderer: (value, {record}) => {
                        const {field} = record.data;
                        return checkbox({value, onChange: () => this.toggleShowLabel(field)});
                    }
                },
                // Hidden
                {field: 'field', hidden: true},
                {field: 'chooserGroup', hidden: true}
            ]
        });
    }

    @action
    private syncMapperData() {
        // Copy latest mappings from grid
        this.mappings = cloneDeep(this.multiZoneGridModel.mappings);

        // Take sample record from grid
        this.sampleRecord = this.getSampleRecord();

        // Sync data for selected zone
        this.syncMapperDataForZone();
    }

    private syncMapperDataForZone() {
        const {fields, mappings, limits, selectedZone} = this,
            mapping = mappings[selectedZone],
            limit = limits?.[selectedZone],
            data = [];

        // 1) Determine which fields are shown and labeled for the zone
        const allowedFields = !isEmpty(limit?.only)
            ? fields.filter(it => limit.only.includes(it.field))
            : fields;

        allowedFields.forEach(f => {
            const fieldMapping = mapping.find(it => f.field === it.field),
                show = !!fieldMapping,
                label = fieldMapping?.showLabel ?? false;

            data.push({...f, show, label});
        });

        // 2) Load into display grid
        this.gridModel.loadData(data);
    }

    private toggleShown(field: string) {
        const {selectedZone} = this,
            currMapping = this.getMappingForFieldAndZone(selectedZone, field);

        if (currMapping) {
            this.removeZoneMapping(selectedZone, field);
        } else {
            this.addZoneMapping(selectedZone, field);
        }

        this.syncMapperDataForZone();
        this.blurCheckboxesAsync();
    }

    private toggleShowLabel(field: string) {
        const {selectedZone} = this,
            currMapping = this.getMappingForFieldAndZone(selectedZone, field);

        this.addOrAdjustZoneMapping(selectedZone, field, {
            showLabel: !currMapping?.showLabel
        });

        this.syncMapperDataForZone();
        this.blurCheckboxesAsync();
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

    /**
     * This is a workaround for an Onsen issue on mobile, where the checkbox will not
     * re-render as long as it has focus.
     */
    private async blurCheckboxesAsync() {
        await wait(1);
        const checkboxes = document.querySelectorAll<HTMLInputElement>('ons-checkbox');
        checkboxes.forEach(it => it.blur());
    }

    //------------------------
    // Sample Display
    //------------------------
    getSampleForMapping(mapping: ZoneMapping): ReactNode {
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
                    gridModel: this.multiZoneGridModel.gridModel
                });
            }
        }

        // Display a placeholder if the sample record is missing a value for the field
        if (isEmpty(value)) {
            return span(`[${field.displayName}]`);
        }

        // Render label if requested
        const label = mapping.showLabel ? `${field.label}: ` : null;
        return span(label, value);
    }

    private getSampleRecord(): StoreRecord {
        // Iterate down to a (likely more fully populated) leaf record.
        let ret = this.multiZoneGridModel.store.records[0];
        while (ret && !isEmpty(ret.children)) {
            ret = ret.children[0];
        }
        return ret;
    }
}

interface MapperField {
    field: string;
    displayName: string;
    label: string;
    renderer: ColumnRenderer;
    column: Column;
    chooserGroup: string;
}
