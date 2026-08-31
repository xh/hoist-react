/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import {PlainObject} from '@xh/hoist/core';
import {isEmpty} from 'lodash';
import type {Field} from '../Field';
import type {Store} from '../Store';
import type {StoreRecordId} from '../StoreRecord';
import {installCalculatedFieldGetters, installSourceFieldGetters} from './FieldGetterSupport';

/**
 * Generates the constructs backing a Store's record `data` objects - the shared defaults object
 * and dense template, plus the generated dense and projection classes carrying calculated field
 * getters. Owned by its Store and rebuilt whenever data config changes, mirroring the Cube's
 * `RowDataGenerator`.
 *
 * All representations keep records on fixed shapes in V8's compact fast-properties mode.
 *
 * @internal
 */
export class RecordDataGenerator {
    private store: Store;

    /** Store-layer calculated fields - cube-layer fields compute on View rows, never here. */
    calcFields: Field[];
    /** Fields with stored values, compared where record reuse is detected. */
    equalityFields: Field[];
    hasCalcFields: boolean;

    private dataDefaults: PlainObject;
    private dataTemplate: PlainObject;
    private denseDataClass: new () => PlainObject;
    private projectionDataClass: new (src: PlainObject) => PlainObject;

    constructor(store: Store) {
        this.store = store;
        this.calcFields = store.fields.filter(it => it.isCalculated && !it.isCubeField);
        this.equalityFields = store.fields.filter(it => !it.isCalculated);
        this.hasCalcFields = !isEmpty(this.calcFields);

        this.dataDefaults = this.createDataDefaults();
        // Clone for fast-props mode - before installing getters, so the spread cannot see them.
        this.dataTemplate = {...this.dataDefaults};
        installCalculatedFieldGetters(this.dataDefaults, this.calcFields, () => store);

        this.denseDataClass = this.createDenseDataClass();
        this.projectionDataClass = this.createProjectionDataClass();
    }

    /** New sparse data - own properties for populated values only, defaults (and calculated
     * getters) via the shared prototype. */
    sparseData(): PlainObject {
        return Object.create(this.dataDefaults);
    }

    /** New dense data - a slot for every Field, all records on one fixed shape. Template clones
     * sidestep dictionary-mode adds (overwrites are not adds); the generated class keeps that
     * guarantee via constructor slack tracking while adding getters a plain clone cannot see. */
    denseData(): PlainObject {
        const {denseDataClass} = this;
        return denseDataClass ? new denseDataClass() : {...this.dataTemplate};
    }

    /** Data adopting a projection raw - the raw itself, or, with calculated fields, a generated
     * getter wrapper over it (`data !== raw`). */
    projectionData(raw: PlainObject): PlainObject {
        const {projectionDataClass} = this;
        return projectionDataClass ? new projectionDataClass(raw) : raw;
    }

    //------------------------
    // Implementation
    //------------------------
    // Shared prototype/template source - a defaultValue slot per stored Field. Store-layer
    // calculated fields hold no slot; their getters are installed on the returned object.
    private createDataDefaults(): PlainObject {
        const ret = {};
        this.store.fields.forEach(field => {
            if (field.isCalculated && !field.isCubeField) return;
            ret[field.name] = field.defaultValue;
        });
        return ret;
    }

    // Null without calculated fields, directing denseData() to the template clone. `id` slots
    // here and below are written post-construction by StoreRecord - an overwrite, never an add.
    private createDenseDataClass(): new () => PlainObject {
        if (!this.hasCalcFields) return null;

        const {store} = this,
            names = this.equalityFields.map(it => it.name),
            defaultValues = this.equalityFields.map(it => it.defaultValue);

        class DenseData {
            id: StoreRecordId = null;

            constructor() {
                for (let i = 0; i < names.length; i++) {
                    this[names[i]] = defaultValues[i];
                }
            }

            // Type-only, erased: field slots assigned by name above.
            [key: string]: any;
        }
        installCalculatedFieldGetters(DenseData.prototype, this.calcFields, () => store);
        return DenseData;
    }

    // Null when not applicable, directing projectionData() to adopt raw objects directly.
    private createProjectionDataClass(): new (src: PlainObject) => PlainObject {
        if (!this.store.projectionOnly || !this.hasCalcFields) return null;

        const {store} = this;
        class ProjectionData {
            id: StoreRecordId = null;
            _src: PlainObject;

            constructor(src: PlainObject) {
                this._src = src;
            }
        }
        installSourceFieldGetters(
            ProjectionData.prototype,
            this.equalityFields.map(it => it.name)
        );
        installCalculatedFieldGetters(ProjectionData.prototype, this.calcFields, () => store);
        return ProjectionData;
    }
}
