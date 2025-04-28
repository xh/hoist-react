import {ActivityTrackingModel} from '@xh/hoist/admin/tabs/activity/tracking/ActivityTrackingModel';
import {FormModel, SubformsFieldModel} from '@xh/hoist/cmp/form';
import {HoistModel, managed} from '@xh/hoist/core';
import {AggregatorToken, FieldType, genDisplayName, required} from '@xh/hoist/data';
import {action, observable, makeObservable} from '@xh/hoist/mobx';
import {computed} from '@xh/hoist/mobx';
import {last, uniqBy} from 'lodash';

/**
 * Slimmed down {@link CubeFieldSpec} for persisted specs of fields to be extracted from the `data`
 * block of loaded track statements and promoted to top-level columns in the grids. These are the
 * entities (stored on parent `ActivityTrackingModel`) that are edited by the this component.
 *
 * TODO - move persistence into here, implement with customer setter to parse and validate?
 *      - validate / defend against dupe fields - make path + agg compound key, bake into normalized name
 */
export interface ActivityTrackingDataFieldSpec {
    /**
     * Path to field data within the `data` block of each track log entry. Can be dot-delimited for
     * nested data (e.g. `timings.preAuth`). See {@link ActivityTrackingModel.processRawTrackLog}.
     */
    path: string;
    /**
     * Normalized name for the field for use in Cube/Grid - adds `df_` prefix to avoid conflicts
     * and strips out dot-delimiters. See {@link ActivityTrackingModel.setDataFields}.
     */
    name: string;
    displayName?: string;
    type?: FieldType;
    isDimension?: boolean;
    aggregator?: AggregatorToken;
}

export class DataFieldsEditorModel extends HoistModel {
    @observable showEditor = false;

    @managed formModel: FormModel;
    private parentModel: ActivityTrackingModel;

    aggTokens: AggregatorToken[] = ['AVG', 'MAX', 'MIN', 'SINGLE', 'SUM', 'UNIQUE'];

    get dataFields(): SubformsFieldModel {
        return this.formModel.fields.dataFields as SubformsFieldModel;
    }

    @computed
    get appliedDataFieldCount(): number {
        return this.parentModel.dataFields.length;
    }

    constructor(parentModel: ActivityTrackingModel) {
        super();
        makeObservable(this);

        this.parentModel = parentModel;

        this.formModel = new FormModel({
            fields: [
                {
                    name: 'dataFields',
                    subforms: {
                        fields: [
                            {name: 'path', rules: [required]},
                            {name: 'displayName'},
                            {name: 'type', initialValue: 'auto'},
                            {name: 'isDimension'},
                            {name: 'aggregator'}
                        ]
                    }
                }
            ]
        });

        this.addReaction({
            track: () => this.parentModel.dataFields,
            run: () => this.syncFromParent(),
            fireImmediately: true
        });
    }

    show() {
        this.syncFromParent();
        this.showEditor = true;
    }

    @action
    applyAndClose() {
        this.syncToParent();
        this.showEditor = false;
    }

    @action
    close() {
        this.showEditor = false;
    }

    addField() {
        this.dataFields.add();
    }

    cloneField(formModel: FormModel) {
        const {dataFields} = this,
            srcIdx = dataFields.value.indexOf(formModel);

        dataFields.add({initialValues: formModel.getData(), index: srcIdx + 1});
    }

    private syncFromParent() {
        this.formModel.init({
            dataFields: this.parentModel.dataFields
        });
    }

    /**
     * Normalize field specs and set onto parent.
     * Note, will de-dupe fields by name w/o any alert to user.
     */
    private syncToParent() {
        const raw = this.formModel.getData().dataFields,
            specs: ActivityTrackingDataFieldSpec[] = raw.map(it => {
                const {displayName, path, aggregator: agg} = it;
                return {
                    ...it,
                    name: 'df_' + path.replaceAll('.', '') + (agg ? `_${agg}` : ''),
                    displayName: displayName || genDisplayName(last(path.split('.')))
                };
            });

        this.parentModel.setDataFields(uniqBy(specs, 'name'));
    }
}
