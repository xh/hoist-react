/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */
import {GridModel} from '@xh/hoist/cmp/grid';
import {HoistModel, XH} from '@xh/hoist/core';
import {bindable, makeObservable} from '@xh/hoist/mobx';

/**
 * @internal
 */
export class JsonSearchPanelImplModel extends HoistModel {
    override xhImpl = true;

    gridModel: GridModel;

    @bindable.ref path;
    @bindable matchingNodes: string;

    get queryBuffer(): number {
        return this.componentProps.queryBuffer ?? 200;
    }

    get docSearchUrl(): string {
        return this.componentProps.docSearchUrl;
    }

    get matchingNodesUrl(): string {
        return this.componentProps.matchingNodesUrl;
    }

    get gridModelConfig() {
        return this.componentProps.gridModelConfig;
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
                run: () => this.loadJsonDocsAsync(),
                debounce: this.queryBuffer
            },
            {
                track: () => [this.gridModel.selectedRecord, this.path],
                run: () => this.loadJsonNodesAsync(),
                debounce: 300
            }
        );
    }

    private async loadJsonDocsAsync() {
        let data = await XH.fetchJson({
            url: this.docSearchUrl,
            params: {path: this.path}
        });

        this.gridModel.loadData(data);
    }

    private async loadJsonNodesAsync() {
        if (!this.gridModel.selectedRecord) {
            this.matchingNodes = '';
            return;
        }

        const nodes = await XH.fetchJson({
            url: this.matchingNodesUrl,
            params: {path: this.path, json: this.gridModel.selectedRecord.data.json}
        });

        this.matchingNodes = JSON.stringify(nodes, null, 2);
    }
}
