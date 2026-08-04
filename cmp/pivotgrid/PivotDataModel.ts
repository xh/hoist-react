import {ColumnSpec} from '@xh/hoist/cmp/grid';
import {HoistModel, PlainObject, XH} from '@xh/hoist/core';
import {Cube} from '@xh/hoist/data/cube/Cube';
import {CubeField, CubeFieldSpec} from '@xh/hoist/data/cube/CubeField';
import {action, makeObservable, observable} from '@xh/hoist/mobx';
import {first, isEmpty, isNil} from 'lodash';

export interface PivotFieldSpec extends CubeFieldSpec {
    columnTemplate?: Omit<ColumnSpec, 'field'>;

    // True if this field can be used as a pivot field
    enablePivot?: boolean;

    // True if this field can be used as a pivot value field
    enableValue?: boolean;
}

export class PivotField extends CubeField {
    readonly columnTemplate?: Omit<ColumnSpec, 'field'>;
    readonly enablePivot: boolean = false;
    readonly enableValue: boolean = false;

    constructor({columnTemplate, enablePivot, enableValue, ...rest}: PivotFieldSpec) {
        super(rest);
        this.columnTemplate = columnTemplate;
        this.enablePivot = enablePivot ?? false;
        this.enableValue = enableValue ?? false;
    }
}

export interface PivotValue {
    field: string;
    path?: string;
    value?: any;
    label?: string;
    children?: PivotValue[];
}

export interface PivotQuery {
    fields: PivotFieldSpec[];
    groupBy?: string[];
    pivotBy?: string[];
    valueFields?: string[];
    includeSummaryRow?: boolean;
    extraSummaryRowFields?: string[];
    extraSummaryColumnFields?: string[];
    includeEmptyPivotValues?: boolean;
}

export interface PivotDataModelConfig {
    rawData: PlainObject[];
    query: PivotQuery;
}

export class PivotDataModel extends HoistModel {
    rawData: PlainObject[];
    query: PivotQuery;

    // -------------------------------
    // Processed data outputs
    // -------------------------------

    // Pivoted and grouped data
    @observable.ref data: PlainObject[] = [];

    // Pivoted summary row data
    @observable.ref summaryRowData: PlainObject[] = [];

    // Hierarchy of pivot values that can be used to create column hierarchies for display
    @observable.ref pivotValues: PivotValue[] = [];

    // All secondary pivot value fields created from the base fields and data
    @observable.ref pivotedValueFields: PivotFieldSpec[] = [];

    // Leaf data that has been decorated with all pivoted values to be grouped and aggregated
    @observable.ref pivotedData: PlainObject[] = [];

    // How long the last data update took to process
    @observable duration: number;

    constructor(config?: PivotDataModelConfig) {
        super();
        makeObservable(this);

        if (config) {
            this.update(config.rawData, config.query);
        }
    }

    @action
    update(rawData: PlainObject[], query: PivotQuery) {
        this.rawData = rawData;
        this.query = this.parseQuery(query);
        this.updateInternal();
    }

    @action
    clearData() {
        this.rawData = [];
        this.updateInternal();
    }

    @action
    updateQuery(query: PivotQuery) {
        this.query = this.parseQuery(query);
        this.updateInternal();
    }

    getField(name: string): PivotFieldSpec {
        return [...this.pivotedValueFields, ...(this.query?.fields ?? [])].find(
            it => it.name === name
        );
    }

    // -------------------------------
    // Implementation
    // -------------------------------

    @action
    private updateInternal() {
        const {rawData} = this;

        // Clear any existing outputs
        this.data = [];
        this.summaryRowData = [];
        this.pivotedData = [];
        this.pivotValues = [];
        this.pivotedValueFields = [];

        // If we have no data or query to process, then nothing to do
        if (isEmpty(rawData) || !this.query) return;

        const startTime = Date.now();

        // Build the pivoted data, generating all the pivot values and fields needed
        this.buildPivotedData(rawData);

        // Query the pivoted data to get the grouped and aggregated data
        const cube = this.createCube(),
            {groupBy, includeSummaryRow} = this.query,
            rows = cube.executeQuery({
                dimensions: groupBy,
                includeLeaves: isEmpty(groupBy),
                includeRoot: true
            }),
            rootData = rows[0];

        // We keep the summary data separate from the main row data since we could have multiple summary rows
        this.data = rootData.children;
        delete rootData.children;

        // Add the standard grand totals summary row data if desired
        this.summaryRowData = [];
        if (includeSummaryRow) {
            this.summaryRowData.push(rootData);
        }

        // Build and add additional summary rows if needed
        const {extraSummaryRowCubeFields} = this;
        extraSummaryRowCubeFields.forEach(field => {
            // Since we added all the fields which needed to be calculated to the view query, the root data will already have all the data we need.
            const data = {
                ...rootData,
                id: `root_${field.name}`,
                cubeLabel: field.displayName ?? field.name,
                cubeDimension: `Total>>${field.name}`,
                summaryField: field.name
            };

            // We do however want to clear out the values for other value fields so that we don't show duplicate entries in totals columns
            this.fields.forEach(it => {
                if (!it.enableValue || it.name === field.name) return;
                data[it.name] = null;
            });

            this.summaryRowData.push(data);
        });

        this.duration = Date.now() - startTime;
    }

    @action
    private buildPivotedData(baseData: PlainObject[]): void {
        const {pivotBy, valueFields} = this.query;
        if (isEmpty(pivotBy) || isEmpty(valueFields)) {
            this.pivotValues = [];
            this.pivotedValueFields = [];
            this.pivotedData = this.rawData;
        } else {
            const pivotValues: PivotValue[] = [],
                pivotedValueFields: PivotFieldSpec[] = [],
                pivotedData = baseData.map(it => {
                    // Recurse through the pivot fields, generating the pivot values (if necessary) and pivot fields (if necessary) while
                    // also decorating the record data with the pivot value fields
                    return this.buildRecordPivotData(
                        {...it},
                        0,
                        pivotValues,
                        '',
                        pivotedValueFields
                    );
                });

            this.pivotValues = pivotValues;
            this.pivotedValueFields = pivotedValueFields;
            this.pivotedData = pivotedData;
        }
    }

    private buildRecordPivotData(
        data: PlainObject,
        pivotFieldIdx: number,
        pivotValues: PivotValue[],
        pivotValuePath: string,
        pivotedValueFields: PivotFieldSpec[]
    ): PlainObject {
        const {valueCubeFields, extraSummaryRowCubeFields} = this,
            {pivotBy, includeEmptyPivotValues} = this.query;

        // 1. Build the PivotValue for this path if it doesn't already exist at this level
        const pivotFieldName = pivotBy[pivotFieldIdx],
            pivotField = this.getField(pivotFieldName),
            value = data[pivotFieldName];

        if (
            !includeEmptyPivotValues &&
            (isNil(value) || (pivotField.type === 'string' && isEmpty(value)))
        ) {
            // If the value is null or empty, we skip this pivot level
            // This is to avoid creating empty pivot values for null/empty values
            return data;
        }

        pivotValuePath = isEmpty(pivotValuePath)
            ? value?.toString()
            : `${pivotValuePath}>>${value}`;

        let pivotValue = pivotValues.find(it => it.value === value);
        if (!pivotValue) {
            let label = value?.toString();
            if (isEmpty(label)) {
                // TODO: Better/configurable handling for empty label
                label = '(empty)';
            }

            const renderer = pivotField.columnTemplate?.renderer;
            if (renderer) {
                try {
                    label = renderer(value, {column: null, record: null, gridModel: null});
                } catch (e) {
                    XH.handleException(e, {
                        message: `Renderer for pivot field ${pivotFieldName} threw while building pivot data. Renderers for pivotable fields wont receive the full context as it would in a cell renderer so should be null-safe.`
                    });
                }
            }

            pivotValue = {field: pivotFieldName, value, label, path: pivotValuePath, children: []};
            pivotValues.push(pivotValue);
        }

        // 2. Add the pivoted value and summary row fields for this level of the pivot
        const newPivotedValueFieldNames: string[] = [];
        valueCubeFields.forEach(baseField => {
            // 2a. Make sure we have the pivoted value field generated
            const name = `${pivotValuePath}>>${baseField.name}`;
            let field = pivotedValueFields.find(f => f.name === name);
            if (!field) {
                // Create the new field by copying the base field but overriding any field names to include the pivot value path as a prefix
                field = {
                    ...baseField,
                    name,
                    dependsOn: baseField.dependsOn?.map(it => `${pivotValuePath}>>${it}`)
                };

                pivotedValueFields.push(field);
                newPivotedValueFieldNames.push(name);
            }

            // 2b. Add the field to the data for this field path so that it can be aggregated later
            data[name] = data[baseField.name];

            // 2c. If this field depends on other fields for aggregation then we need to be sure we also have that data
            //     However we do not want these represented in the pivot structure so we do not add them to the pivot values
            if (!isEmpty(baseField.dependsOn)) {
                baseField.dependsOn.forEach(dependencyFieldName => {
                    const name = `${pivotValuePath}>>${dependencyFieldName}`;
                    let field = pivotedValueFields.find(f => f.name === name);
                    if (!field) {
                        field = {...this.getField(dependencyFieldName), name};
                        pivotedValueFields.push(field);
                    }

                    data[name] = data[dependencyFieldName];
                });
            }
        });

        // 3. Add the pivoted summary row fields for this level of the pivot
        extraSummaryRowCubeFields.forEach(baseField => {
            // 3a. Make sure we have the pivoted value field generated
            const name = `${pivotValuePath}>>${baseField.name}`;
            let field = pivotedValueFields.find(f => f.name === name);
            if (!field) {
                field = {...baseField, name};
                pivotedValueFields.push(field);
            }

            // 3b. Add the field to the data for this field path so that it can be aggregated later
            data[name] = data[baseField.name];
        });

        // 4. If we have more levels of pivoting to process then recurse deeper
        if (pivotFieldIdx !== pivotBy.length - 1) {
            return this.buildRecordPivotData(
                data,
                pivotFieldIdx + 1,
                pivotValue.children,
                pivotValuePath,
                pivotedValueFields
            );
        } else {
            // Add the pivoted value fields to our pivot values

            // If we only have 1 value field, then we don't bother creating leaf pivot values for them.
            // We will instead use the pivot value and tie it to the value field.
            // Else we will add all the new pivoted value fields as children
            if (valueCubeFields.length == 1 && !isEmpty(newPivotedValueFieldNames)) {
                pivotValue.field = first(newPivotedValueFieldNames);
            } else {
                pivotValue.children.push(
                    ...newPivotedValueFieldNames.map(it => ({
                        field: it,
                        path: pivotValuePath
                    }))
                );
            }
        }

        // Done with this branch so return the data
        return data;
    }

    private get fields(): PivotFieldSpec[] {
        return this.query.fields;
    }

    private get valueCubeFields(): PivotFieldSpec[] {
        const {fields, valueFields} = this.query;
        return valueFields.map(it => fields.find(f => f.name === it));
    }

    private get extraSummaryRowCubeFields(): PivotFieldSpec[] {
        const {fields, extraSummaryRowFields} = this.query;
        return extraSummaryRowFields.map(it => fields.find(f => f.name === it));
    }

    private createCube(): Cube {
        const {fields} = this.query;
        return new Cube({
            data: this.pivotedData,
            idSpec: () => XH.genId(),
            fields: [...fields, ...this.pivotedValueFields].map(it => new PivotField(it))
        });
    }

    private parseQuery(query: PivotQuery): PivotQuery {
        return {
            fields: query.fields ?? [],
            groupBy: query.groupBy ?? [],
            pivotBy: query.pivotBy ?? [],
            valueFields: query.valueFields ?? [],
            includeSummaryRow: !!query.includeSummaryRow,
            extraSummaryRowFields: query.extraSummaryRowFields ?? [],
            extraSummaryColumnFields: query.extraSummaryColumnFields ?? []
        };
    }
}
