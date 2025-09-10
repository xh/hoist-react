/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2025 Extremely Heavy Industries Inc.
 */

import {XH} from '@xh/hoist/core';
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
    async fetchDataAsync(): Promise<{views: ViewInfo[]; state: ViewUserState}> {
        const {typeDisplayName, type, instance} = this.model;
        try {
            const ret = await XH.fetchJson({
                url: 'xhView/allData',
                params: {type, viewInstance: instance}
            });
            return {
                views: ret.views.map(v => new ViewInfo(v, this.model)),
                state: ret.state
            };
        } catch (e) {
            throw XH.exception({
                message: `Unable to fetch ${pluralize(typeDisplayName)}`,
                cause: e
            });
        }
    }

    /** Fetch the latest version of a view, or the in-code default if token null/undefined/empty. */
    async fetchViewAsync(token: string): Promise<View<T>> {
        const {model} = this;
        if (!token) return View.createDefault(model);
        try {
            const raw = await XH.fetchJson({url: 'xhView/get', params: {token}});
            return View.fromBlob(raw, model);
        } catch (e) {
            throw XH.exception({message: `Unable to fetch view with token ${token}`, cause: e});
        }
    }

    /** Create a new view, owned by the current user.*/
    async createViewAsync(spec: ViewCreateSpec): Promise<View<T>> {
        const {model} = this;
        try {
            const raw = await XH.postJson({
                url: 'xhView/create',
                body: {type: model.type, ...spec}
            });
            return View.fromBlob(raw, model);
        } catch (e) {
            throw XH.exception({message: `Unable to create ${model.typeDisplayName}`, cause: e});
        }
    }

    /** Update all aspects of a view's metadata.*/
    async updateViewInfoAsync(view: ViewInfo, updates: ViewUpdateSpec): Promise<View<T>> {
        try {
            this.ensureEditable(view);
            const raw = await XH.postJson({
                url: 'xhView/updateInfo',
                params: {token: view.token},
                body: updates
            });
            return View.fromBlob(raw, this.model);
        } catch (e) {
            throw XH.exception({message: `Unable to update ${view.typedName}`, cause: e});
        }
    }

    /** Update a view's value. */
    async updateViewValueAsync(view: View<T>, value: Partial<T>): Promise<View<T>> {
        try {
            this.ensureEditable(view.info);
            const raw = await XH.postJson({
                url: 'xhView/updateValue',
                params: {token: view.token},
                body: value
            });
            return View.fromBlob(raw, this.model);
        } catch (e) {
            throw XH.exception({
                message: `Unable to update value for ${view.typedName}`,
                cause: e
            });
        }
    }

    async deleteViewsAsync(views: ViewInfo[]) {
        views.forEach(v => this.ensureEditable(v));
        try {
            await XH.postJson({
                url: 'xhView/delete',
                params: {tokens: map(views, 'token').join(',')}
            });
        } catch (e) {
            throw XH.exception({
                message: `Failed to delete ${pluralize(this.model.typeDisplayName)}`,
                cause: e
            });
        }
    }

    //--------------------------
    // State related changes
    //--------------------------
    async updateStateAsync(update: Partial<ViewUserState>): Promise<ViewUserState> {
        const {type, instance} = this.model;
        return XH.postJson({
            url: 'xhView/updateState',
            params: {type, viewInstance: instance},
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
