/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2022 Extremely Heavy Industries Inc.
 */
import {HoistBase, managed, RefreshContextModel, TaskObserver} from '../';
import {LoadSpec, Loadable} from './';
import {makeObservable, observable, runInAction} from '@xh/hoist/mobx';
import {throwIf} from '@xh/hoist/utils/js';
import {isPlainObject} from 'lodash';

/**
 * Provides support for objects that participate in Hoist's loading/refresh lifecycle.
 *
 * This utility is used by core Hoist classes such as {@see HoistModel} and {@see HoistService},
 * which will automatically create an instance of this class if they have declared a concrete
 * implementation of `doLoadAsync()`, signalling that they wish to take advantage of the additional
 * tracking and management provided here.
 *
 * Not typically created directly by applications.
 */
export class LoadSupport extends HoistBase implements Loadable {

    lastRequested: LoadSpec = null;
    lastSucceeded: LoadSpec = null;

    @managed
    loadModel: TaskObserver = TaskObserver.trackLast();

    @observable.ref
    lastLoadRequested: Date = null;

    @observable.ref
    lastLoadCompleted: Date = null;

    @observable.ref
    lastLoadException: any = null;

    target: Loadable;

    constructor(target: Loadable) {
        super();
        makeObservable(this);
        this.target = target;
    }

    async loadAsync(loadSpec?: LoadSpec|any) {
        throwIf(
            loadSpec && !(loadSpec.isLoadSpec || isPlainObject(loadSpec)),
            'Unexpected param passed to loadAsync().  If triggered via a reaction '  +
            'ensure call is wrapped in a closure.'
        );
        loadSpec = new LoadSpec({...loadSpec, owner: this});

        return this.doLoadAsync(loadSpec);
    }

    async refreshAsync(meta?: object) {
        return this.loadAsync({meta, isRefresh: true});
    }

    async autoRefreshAsync(meta?: object) {
        return this.loadAsync({meta, isAutoRefresh: true});
    }

    async doLoadAsync(loadSpec: LoadSpec):Promise<any> {
        let {target, loadModel} = this;

        // Auto-refresh:
        // Skip if we have a pending triggered refresh, and never link to loadModel
        if (loadSpec.isAutoRefresh) {
            if (loadModel.isPending) return;
            loadModel = null;
        }

        runInAction(() => this.lastLoadRequested = new Date());
        this.lastRequested = loadSpec;

        let exception = null;

        return target
            .doLoadAsync(loadSpec)
            .linkTo(loadModel)
            .catch(e => {
                exception = e;
                throw e;
            })
            .finally(() => {
                runInAction(() => {
                    this.lastLoadCompleted = new Date();
                    this.lastLoadException = exception;
                });

                if (!exception) {
                    this.lastSucceeded = loadSpec;
                }

                if (target instanceof RefreshContextModel) return;

                const elapsed = this.lastLoadCompleted.getTime() - this.lastLoadRequested.getTime(),
                    msg = `[${target.constructor.name}] | ${loadSpec.typeDisplay} | ${exception ? 'failed | ' : ''}${elapsed}ms`;

                if (exception) {
                    if (exception.isRoutine) {
                        console.debug(msg, exception);
                    } else {
                        console.error(msg, exception);
                    }
                } else {
                    console.debug(msg);
                }
            });
    }
}

/**
 * Load a collection of objects concurrently.
 *
 * Note that this method uses 'allSettled' in its implementation, meaning a failure of any one call
 * will not cause the entire batch to throw.
 *
 * @param objs - list of objects to be loaded
 * @param [loadSpec] - metadata related to this request.
*/
export async function loadAllAsync(objs: Loadable[], loadSpec?: LoadSpec|any) {
    const promises = objs.map(it => it.loadAsync(loadSpec)),
        ret = await Promise.allSettled(promises);

    ret.filter(it => it.status === 'rejected')
        .forEach((err: any) => console.error('Failed to Load Object', err.reason));

    return ret;
}
