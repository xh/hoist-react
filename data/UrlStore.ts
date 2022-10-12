/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */

import {XH, managed, LoadSupport, LoadSpec, Loadable} from '@xh/hoist/core';

import {Store} from './Store';

/**
 * A store with built-in support for loading data from a URL.
 */
export class UrlStore extends Store implements Loadable {

    url: string;
    dataRoot: string;

    @managed
    loadSupport: LoadSupport = new LoadSupport(this);

    /**
     * @param url - URL from which to load data.
     * @param [dataRoot] - Key of root node for records in returned data object.
     * @param {...*} - Additional arguments to pass to Store.
     */
    constructor(
        {url, dataRoot = null, ...localStoreArgs}:
        {url: string, dataRoot?: string, [key:string]:any}
    ) {
        super(localStoreArgs as any);
        this.url = url;
        this.dataRoot = dataRoot;
    }

    get loadModel()                         {return this.loadSupport.loadModel}
    get lastLoadRequested()                 {return this.loadSupport.lastLoadRequested}
    get lastLoadCompleted()                 {return this.loadSupport.lastLoadCompleted}
    get lastLoadException()                 {return this.loadSupport.lastLoadException}
    async refreshAsync(meta?: object)       {return this.loadSupport.refreshAsync(meta)}
    async autoRefreshAsync(meta?: object)   {return this.loadSupport.autoRefreshAsync(meta)}
    async loadAsync(loadSpec?: LoadSpec|Partial<LoadSpec>) {
        return this.loadSupport.loadAsync(loadSpec);
    }


    /**
     * Not for application use.
     *
     * Call loadAsync() instead.
     *
     * @package
     */
    async doLoadAsync(loadSpec: LoadSpec): Promise<void> {
        const {url, dataRoot} = this;
        let data = await XH.fetchJson({url, loadSpec});
        if (dataRoot) data = data[dataRoot];
        this.loadData(data);
    }
}
