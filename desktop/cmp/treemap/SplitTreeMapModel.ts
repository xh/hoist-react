/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */
import {HoistModel, managed, PlainObject, Theme} from '@xh/hoist/core';
import '@xh/hoist/desktop/register';
import {action, observable, computed, makeObservable} from '@xh/hoist/mobx';
import {throwIf, withDefault} from '@xh/hoist/utils/js';
import {StoreRecord, StoreRecordId} from '@xh/hoist/data';
import {ReactNode} from 'react';
import {uniq} from 'lodash';

import {TreeMapAlgorithm, TreeMapColorMode, TreeMapModel, TreeMapConfig} from './TreeMapModel';

/**
 * Core Model for a SplitTreeMap.
 *
 * Binds to a Store (or GridModel) and splits the data into two managed child TreeMaps.
 * Users should specify a `mapFilter` function to control how records are divided
 * across the two TreeMaps.
 *
 * Additionally, accepts and passes along all settings for TreeMapModel.
 * @see TreeMapModel
 */
interface SplitTreeMapConfig extends TreeMapConfig {
    /**
     * Filter used to allocate records between the primary and secondary maps.
     * Defaults to: `record[valueField] >= 0`.
     */
    mapFilter?: SplitTreeMapFilterFn;

    /** Function to render region titles. */
    mapTitleFn?: SplitTreeMapTitleFn;

    /** True to insert a four pixel buffer between the two maps. */
    showSplitter?: boolean;

    /** Layout orientation to use. */
    orientation?: SplitTreeMapOrientation;
}

export class SplitTreeMapModel extends HoistModel {
    //------------------------
    // Immutable public properties
    //------------------------
    mapFilter: SplitTreeMapFilterFn;
    mapTitleFn: SplitTreeMapTitleFn;
    showSplitter: boolean;
    @managed primaryMapModel: TreeMapModel;
    @managed secondaryMapModel: TreeMapModel;

    //------------------------
    // Observable API
    //------------------------
    @observable orientation: SplitTreeMapOrientation;

    constructor(config: SplitTreeMapConfig) {
        super();
        makeObservable(this);

        const {
            mapFilter,
            mapTitleFn,
            showSplitter = false,
            orientation = 'vertical',
            ...rest
        } = config ?? {};

        this.mapFilter = withDefault(mapFilter, this.defaultMapFilter);
        this.mapTitleFn = mapTitleFn;
        this.showSplitter = showSplitter;

        throwIf(
            !['vertical', 'horizontal'].includes(orientation),
            `Orientation "${orientation}" not recognised.`
        );
        this.orientation = orientation;

        this.primaryMapModel = new TreeMapModel({...rest, filter: r => this.mapFilter(r)});
        this.secondaryMapModel = new TreeMapModel({...rest, filter: r => !this.mapFilter(r)});
    }

    // Getters derived from both underlying TreeMapModels.
    @computed
    get total(): number {
        return this.primaryMapModel.total && this.secondaryMapModel.total;
    }

    @computed
    get selectedIds(): StoreRecordId[] {
        return uniq([...this.primaryMapModel.selectedIds, ...this.secondaryMapModel.selectedIds]);
    }

    @computed
    get isMasking(): boolean {
        return this.primaryMapModel.isMasking || this.secondaryMapModel.isMasking;
    }

    @computed
    get empty(): boolean {
        return this.primaryMapModel.empty && this.secondaryMapModel.empty;
    }

    // Simple getters and methods trampolined from underlying TreeMapModels.
    // Where possible, we consult only the primary map model, as we don't expect the two to become out of sync.
    get expandState() {
        return this.primaryMapModel.expandState;
    }
    get error() {
        return this.primaryMapModel.error;
    }
    get emptyText() {
        return this.primaryMapModel.emptyText;
    }
    get highchartsConfig() {
        return this.primaryMapModel.highchartsConfig;
    }
    get labelField() {
        return this.primaryMapModel.labelField;
    }
    get heatField() {
        return this.primaryMapModel.heatField;
    }
    get maxDepth() {
        return this.primaryMapModel.maxDepth;
    }
    get maxHeat() {
        return this.primaryMapModel.maxHeat;
    }
    get algorithm() {
        return this.primaryMapModel.algorithm;
    }
    get colorMode() {
        return this.primaryMapModel.colorMode;
    }
    get theme() {
        return this.primaryMapModel.theme;
    }

    @action
    setOrientation(orientation: SplitTreeMapOrientation) {
        this.orientation = orientation;
    }

    @action
    setHighchartsConfig(highchartsConfig: any) {
        this.primaryMapModel.highchartsConfig = highchartsConfig;
        this.secondaryMapModel.highchartsConfig = highchartsConfig;
    }

    @action
    setLabelField(labelField: string) {
        this.primaryMapModel.labelField = labelField;
        this.secondaryMapModel.labelField = labelField;
    }

    @action
    setHeatField(heatField: string) {
        this.primaryMapModel.heatField = heatField;
        this.secondaryMapModel.heatField = heatField;
    }

    @action
    setMaxDepth(maxDepth: number) {
        this.primaryMapModel.maxDepth = maxDepth;
        this.secondaryMapModel.maxDepth = maxDepth;
    }

    @action
    setMaxHeat(maxHeat: number) {
        this.primaryMapModel.maxHeat = maxHeat;
        this.secondaryMapModel.maxHeat = maxHeat;
    }

    @action
    setAlgorithm(algorithm: TreeMapAlgorithm) {
        this.primaryMapModel.algorithm = algorithm;
        this.secondaryMapModel.algorithm = algorithm;
    }

    @action
    setColorMode(colorMode: TreeMapColorMode) {
        this.primaryMapModel.colorMode = colorMode;
        this.secondaryMapModel.colorMode = colorMode;
    }

    @action
    setTheme(theme: Theme) {
        this.primaryMapModel.theme = theme;
        this.secondaryMapModel.theme = theme;
    }

    //-------------------------
    // Implementation
    //-------------------------
    defaultMapFilter = record => {
        const data = record instanceof StoreRecord ? record.data : record;
        return data[this.primaryMapModel.valueField] >= 0;
    };
}

/**
 * Return true if record belongs to / should appear within the primary map, falsy to
 * have it allocated to the secondary map.
 */
type SplitTreeMapFilterFn = (record: PlainObject | StoreRecord) => boolean;

/**
 * Function to generate the region title to display.
 * `isPrimary` is true if the region is the primary (top/left) map in the pair.
 */
type SplitTreeMapTitleFn = (treeMapModel: TreeMapModel, isPrimary: boolean) => ReactNode;

/**
 * Layout orientation:
 *   - 'vertical' (default) to display primary and secondary maps one above the other.
 *   - 'horizontal' to show them side-by-side.
 */
type SplitTreeMapOrientation = 'vertical' | 'horizontal';
