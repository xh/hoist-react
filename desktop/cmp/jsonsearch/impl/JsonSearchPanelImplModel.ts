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

    @bindable path: string = '';
    @bindable pathOrValue: 'path' | 'value' = 'value';
    @bindable pathFormat: 'XPath' | 'JSONPath' = 'XPath';
    @bindable matchingNodes: string = '';
    @bindable matchingNodeCount: number = 0;

    get asPathList(): boolean {
        return this.pathOrValue === 'path';
    }

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
                track: () => [
                    this.gridModel.selectedRecord,
                    this.path,
                    this.pathOrValue,
                    this.pathFormat
                ],
                run: () => this.loadJsonNodesAsync(),
                debounce: 300
            }
        );
    }

    private async loadJsonDocsAsync() {
        if (this.path.endsWith('.') || this.path === '$') {
            this.gridModel.clear();
            return;
        }

        const data = await XH.fetchJson({
            url: this.docSearchUrl,
            params: {path: this.path}
        });

        this.gridModel.loadData(data);
    }

    private async loadJsonNodesAsync() {
        if (!this.gridModel.selectedRecord) {
            this.matchingNodeCount = 0;
            this.matchingNodes = '';
            return;
        }

        let nodes = await XH.fetchJson({
            url: this.matchingNodesUrl,
            params: {
                path: this.path,
                asPathList: this.pathOrValue === 'path',
                json: this.gridModel.selectedRecord.data.json
            }
        });

        this.matchingNodeCount = nodes.length;
        if (this.asPathList && this.pathFormat === 'XPath') {
            nodes = nodes.map(it => this.convertToPath(it));
        }
        this.matchingNodes = JSON.stringify(nodes, null, 2);
    }

    private convertToPath(JSONPath: string): string {
        return JSONPath.replaceAll(/^\$\['?/g, '/')
            .replaceAll(/^\$/g, '')
            .replaceAll(/'?]\['?/g, '/')
            .replaceAll(/'?]$/g, '');
    }
}
