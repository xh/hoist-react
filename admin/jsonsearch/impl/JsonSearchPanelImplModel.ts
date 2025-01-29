/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {GridModel} from '@xh/hoist/cmp/grid';
import {GroupingChooserModel} from '@xh/hoist/cmp/grouping';
import {HoistModel, managed, TaskObserver, XH} from '@xh/hoist/core';
import {action, bindable, makeObservable, observable} from '@xh/hoist/mobx';
import {isEmpty, zipWith} from 'lodash';

/**
 * @internal
 */
export class JsonSearchPanelImplModel extends HoistModel {
    override xhImpl = true;

    private matchingNodesUrl = 'jsonSearch/getMatchingNodes';

    @managed gridModel: GridModel;
    @managed groupingChooserModel: GroupingChooserModel;
    @managed docLoadTask: TaskObserver = TaskObserver.trackLast();
    @managed nodeLoadTask: TaskObserver = TaskObserver.trackLast();

    @observable groupBy: string = null;
    @observable isOpen: boolean = false;

    @bindable.ref error = null;
    @bindable path: string = '';
    @bindable readerContentType: 'document' | 'matches' = 'matches';
    @bindable pathFormat: 'XPath' | 'JSONPath' = 'XPath';
    @bindable readerContent: string = '';
    @bindable matchingNodeCount: number = 0;

    get subjectName(): string {
        return this.componentProps.subjectName;
    }

    get docSearchUrl(): string {
        return this.componentProps.docSearchUrl;
    }

    get selectedRecord() {
        return this.gridModel.selectedRecord;
    }

    get gridModelConfig() {
        return this.componentProps.gridModelConfig;
    }

    get groupByOptions() {
        return [...this.componentProps.groupByOptions, {value: null, label: 'None'}];
    }

    @action
    toggleSearchIsOpen() {
        this.isOpen = !this.isOpen;
    }

    constructor() {
        super();
        makeObservable(this);
    }

    override onLinked() {
        this.gridModel = new GridModel({
            ...this.gridModelConfig,
            selModel: 'single'
        });

        this.addReaction(
            {
                track: () => this.path,
                run: path => {
                    if (isEmpty(path)) {
                        this.error = null;
                        this.gridModel.clear();
                    }
                }
            },
            {
                track: () => [this.selectedRecord, this.readerContentType, this.pathFormat],
                run: () => this.loadreaderContentAsync(),
                debounce: 300
            }
        );
    }

    async loadJsonDocsAsync() {
        if (isEmpty(this.path)) {
            this.error = null;
            this.gridModel.clear();
            return;
        }

        try {
            const data = await XH.fetchJson({
                url: this.docSearchUrl,
                params: {path: this.path}
            }).linkTo(this.docLoadTask);

            this.error = null;
            this.gridModel.loadData(data);
            this.gridModel.selectFirstAsync();
        } catch (e) {
            this.gridModel.clear();
            this.error = e;
        }
    }

    private async loadreaderContentAsync() {
        if (!this.selectedRecord) {
            this.matchingNodeCount = 0;
            this.readerContent = '';
            return;
        }

        const {json} = this.selectedRecord.data;

        if (this.readerContentType === 'document') {
            this.readerContent = JSON.stringify(JSON.parse(json), null, 2);
            return;
        }

        let nodes = await XH.fetchJson({
            url: this.matchingNodesUrl,
            params: {
                path: this.path,
                json
            }
        }).linkTo(this.nodeLoadTask);

        this.matchingNodeCount = nodes.paths.length;
        nodes = zipWith(nodes.paths, nodes.values, (path: string, value) => {
            return {
                path: this.pathFormat === 'XPath' ? this.convertToXPath(path) : path,
                value
            };
        });
        this.readerContent = JSON.stringify(nodes, null, 2);
    }

    private convertToXPath(JSONPath: string): string {
        return JSONPath.replaceAll(/^\$\['?/g, '/')
            .replaceAll(/^\$/g, '')
            .replaceAll(/'?]\['?/g, '/')
            .replaceAll(/'?]$/g, '');
    }

    @action
    private setGroupBy(groupBy: string) {
        this.groupBy = groupBy;

        // Always select first when regrouping.
        const groupByArr = groupBy ? groupBy.split(',') : [];
        this.gridModel.setGroupBy(groupByArr);
        this.gridModel.preSelectFirstAsync();
    }
}
