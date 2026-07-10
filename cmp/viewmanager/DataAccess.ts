/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */

import {CallContext, XH} from '@xh/hoist/core';
import {pluralize, throwIf} from '@xh/hoist/utils/js';
import {map} from 'lodash';
import {ViewInfo} from './ViewInfo';
import {View} from './View';
import {ViewManagerModel, ViewUserState, ViewUpdateSpec, ViewCreateSpec} from './ViewManagerModel';

/**
 * Supporting class for accessing and updating ViewManager and View data.
 *
 * @internal
 */
export class DataAccess<T> {
    private readonly model: ViewManagerModel<T>;

    constructor(model: ViewManagerModel<T>) {
        this.model = model;
    }

    //---------------
    // Load/search.
    //---------------
    /** Fetch metadata for all views accessible by current user. */
    async fetchDataAsync(ctx: CallContext): Promise<{views: ViewInfo[]; state: ViewUserState}> {
        const {model} = this;
        return model
            .runner(ctx)
            .run(async ctx => {
                const ret = await XH.fetchJson(
                    {
                        url: 'xhView/allData',
                        params: {type: model.type, viewInstance: model.instance}
                    },
                    ctx
                );
                return {
                    views: ret.views.map(v => new ViewInfo(v, model)),
                    state: ret.state
                };
            })
            .catch(e => {
                throw XH.exception({
                    message: `Unable to fetch ${pluralize(model.typeDisplayName)}`,
                    cause: e
                });
            });
    }

    /** Fetch the latest version of a view, or the in-code default if token null/undefined/empty. */
    async fetchViewAsync(token: string, ctx: CallContext): Promise<View<T>> {
        const {model} = this;
        if (!token) return View.createDefault(model);
        return model
            .runner(ctx)
            .run(async ctx =>
                View.fromBlob(await XH.fetchJson({url: 'xhView/get', params: {token}}, ctx), model)
            )
            .catch(e => {
                throw XH.exception({message: `Unable to fetch view with token ${token}`, cause: e});
            });
    }

    /** Create a new view, owned by the current user.*/
    async createViewAsync(spec: ViewCreateSpec, ctx: CallContext): Promise<View<T>> {
        const {model} = this;
        return model
            .runner(ctx)
            .run(async ctx =>
                View.fromBlob(
                    await XH.postJson(
                        {url: 'xhView/create', body: {type: model.type, ...spec}},
                        ctx
                    ),
                    model
                )
            )
            .catch(e => {
                throw XH.exception({
                    message: `Unable to create ${model.typeDisplayName}`,
                    cause: e
                });
            });
    }

    /** Update all aspects of a view's metadata.*/
    async updateViewInfoAsync(
        view: ViewInfo,
        updates: ViewUpdateSpec,
        ctx: CallContext
    ): Promise<View<T>> {
        this.ensureEditable(view);
        const {model} = this;
        return model
            .runner(ctx)
            .run(async ctx =>
                View.fromBlob(
                    await XH.postJson(
                        {
                            url: 'xhView/updateInfo',
                            params: {token: view.token},
                            body: updates
                        },
                        ctx
                    ),
                    model
                )
            )
            .catch(e => {
                throw XH.exception({message: `Unable to update ${view.typedName}`, cause: e});
            });
    }

    /** Apply the same metadata updates to multiple views.*/
    async updateViewsInfoAsync(
        views: ViewInfo[],
        updates: ViewUpdateSpec,
        ctx: CallContext
    ): Promise<void> {
        views.forEach(v => this.ensureEditable(v));
        const {model} = this;
        return model
            .runner(ctx)
            .postJson({
                url: 'xhView/bulkUpdateInfo',
                params: {tokens: map(views, 'token').join(',')},
                body: updates
            })
            .catch(e => {
                throw XH.exception({
                    message: `Unable to update ${pluralize(model.typeDisplayName)}`,
                    cause: e
                });
            });
    }

    /** Update a view's value. */
    async updateViewValueAsync(
        view: View<T>,
        value: Partial<T>,
        ctx: CallContext
    ): Promise<View<T>> {
        this.ensureEditable(view.info);
        const {model} = this;
        return model
            .runner(ctx)
            .run(async ctx =>
                View.fromBlob(
                    await XH.postJson(
                        {
                            url: 'xhView/updateValue',
                            params: {token: view.token},
                            body: value
                        },
                        ctx
                    ),
                    model
                )
            )
            .catch(e => {
                throw XH.exception({
                    message: `Unable to update value for ${view.typedName}`,
                    cause: e
                });
            });
    }

    async deleteViewsAsync(views: ViewInfo[], ctx: CallContext) {
        views.forEach(v => this.ensureEditable(v));
        const {model} = this;
        return model
            .runner(ctx)
            .postJson({
                url: 'xhView/delete',
                params: {tokens: map(views, 'token').join(',')}
            })
            .catch(e => {
                throw XH.exception({
                    message: `Failed to delete ${pluralize(model.typeDisplayName)}`,
                    cause: e
                });
            });
    }

    //--------------------------
    // State related changes
    //--------------------------
    async updateStateAsync(
        update: Partial<ViewUserState>,
        ctx: CallContext
    ): Promise<ViewUserState> {
        const {model} = this;
        return model.runner(ctx).postJson({
            url: 'xhView/updateState',
            params: {type: model.type, viewInstance: model.instance},
            body: update
        });
    }

    //------------------
    // Implementation
    //------------------
    private ensureEditable(view: ViewInfo) {
        const {model} = this;
        throwIf(
            !view.isEditable,
            `Cannot save changes to ${model.typeDisplayName} - missing required permission.`
        );
    }
}
