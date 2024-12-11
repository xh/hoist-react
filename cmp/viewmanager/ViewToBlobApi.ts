/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject, XH} from '@xh/hoist/core';
import {pluralize, throwIf} from '@xh/hoist/utils/js';
import {omit} from 'lodash';
import {ViewInfo} from './ViewInfo';
import {View} from './View';
import {ViewManagerModel} from './ViewManagerModel';

export interface ViewCreateSpec {
    name: string;
    group: string;
    description: string;
    isShared: boolean;
    value?: PlainObject;
}

export interface ViewUpdateSpec {
    name: string;
    group: string;
    description: string;
    isShared?: boolean;
    isDefaultPinned?: boolean;
}

/**
 * Class for accessing and updating views using JSON Blobs Service.
 *
 * @internal
 */
export class ViewToBlobApi<T> {
    private model: ViewManagerModel<T>;

    constructor(model: ViewManagerModel<T>) {
        this.model = model;
    }

    //---------------
    // Load/search.
    //---------------
    /**
     * Fetch metadata for all views that this user has access to.
     */
    async fetchViewInfosAsync(): Promise<ViewInfo[]> {
        const {model} = this;
        try {
            const blobs = await XH.jsonBlobService.listAsync({
                type: model.type,
                includeValue: false
            });
            return blobs.map(b => new ViewInfo(b, model));
        } catch (e) {
            throw XH.exception({
                message: `Unable to fetch ${pluralize(model.typeDisplayName)}`,
                cause: e
            });
        }
    }

    /** Fetch the latest version of a view. */
    async fetchViewAsync(info: ViewInfo): Promise<View<T>> {
        const {model} = this;
        if (!info) return View.createDefault(model);
        try {
            const blob = await XH.jsonBlobService.getAsync(info.token);
            return View.fromBlob(blob, model);
        } catch (e) {
            throw XH.exception({message: `Unable to fetch ${info.typedName}`, cause: e});
        }
    }

    //-----------------
    // Crud
    //-----------------
    /** Create a new view, owned by the current user.*/
    async createViewAsync(spec: ViewCreateSpec): Promise<View<T>> {
        const {model} = this;
        try {
            const blob = await XH.jsonBlobService.createAsync({
                type: model.type,
                name: spec.name,
                description: spec.description,
                acl: spec.isShared ? '*' : null,
                meta: {group: spec.group, isShared: spec.isShared},
                value: spec.value
            });
            const ret = View.fromBlob(blob, model);
            this.trackChange('Created View', ret);
            return ret;
        } catch (e) {
            throw XH.exception({message: `Unable to create ${model.typeDisplayName}`, cause: e});
        }
    }

    /** Update all aspects of a views metadata.*/
    async updateViewInfoAsync(view: ViewInfo, updates: ViewUpdateSpec): Promise<View<T>> {
        try {
            this.ensureEditable(view);
            const {isGlobal} = view,
                {name, group, description, isShared, isDefaultPinned} = updates,
                meta = {...view.meta, group},
                blob = await XH.jsonBlobService.updateAsync(view.token, {
                    name: name.trim(),
                    description: description?.trim(),
                    acl: isGlobal || isShared ? '*' : null,
                    meta: isGlobal ? {...meta, isDefaultPinned} : {...meta, isShared}
                });
            const ret = View.fromBlob(blob, this.model);
            this.trackChange('Updated View Info', ret);
            return ret;
        } catch (e) {
            throw XH.exception({message: `Unable to update ${view.typedName}`, cause: e});
        }
    }

    /** Promote a view to global visibility/ownership status. */
    async makeViewGlobalAsync(view: ViewInfo): Promise<View<T>> {
        try {
            this.ensureEditable(view);
            const meta = view.meta,
                blob = await XH.jsonBlobService.updateAsync(view.token, {
                    owner: null,
                    acl: '*',
                    meta: omit(meta, ['isShared'])
                });
            const ret = View.fromBlob(blob, this.model);
            this.trackChange('Updated View Info', ret);
            return ret;
        } catch (e) {
            throw XH.exception({message: `Unable to update ${view.typedName}`, cause: e});
        }
    }

    /** Update a view's value. */
    async updateViewValueAsync(view: View<T>, value: Partial<T>): Promise<View<T>> {
        try {
            this.ensureEditable(view.info);
            const blob = await XH.jsonBlobService.updateAsync(view.token, {value});
            const ret = View.fromBlob(blob, this.model);
            if (ret.isGlobal) {
                this.trackChange('Updated Global View definition', ret);
            }
            return ret;
        } catch (e) {
            throw XH.exception({
                message: `Unable to update value for ${view.typedName}`,
                cause: e
            });
        }
    }

    /** Delete a view. */
    async deleteViewAsync(view: ViewInfo) {
        try {
            this.ensureEditable(view);
            await XH.jsonBlobService.archiveAsync(view.token);
            this.trackChange('Deleted View', view);
        } catch (e) {
            throw XH.exception({message: `Unable to delete ${view.typedName}`, cause: e});
        }
    }

    //------------------
    // Implementation
    //------------------
    private trackChange(message: string, v: View | ViewInfo) {
        XH.track({
            message,
            category: 'Views',
            data: {name: v.name, token: v.token, isGlobal: v.isGlobal, type: v.type}
        });
    }

    private ensureEditable(view: ViewInfo) {
        const {model} = this;
        throwIf(
            !view.isEditable,
            `Cannot save changes to ${model.globalDisplayName} ${model.typeDisplayName} - missing required permission.`
        );
    }
}
