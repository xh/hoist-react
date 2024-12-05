/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject, XH} from '@xh/hoist/core';
import {pluralize} from '@xh/hoist/utils/js';
import {ViewInfo} from './ViewInfo';
import {View} from './View';
import {ViewManagerModel} from './ViewManagerModel';

/**
 * Class for accessing and updating views using JSON Blobs Service.
 *
 * @internal
 */
export class ViewToBlobApi<T> {
    private owner: ViewManagerModel<T>;

    constructor(owner: ViewManagerModel<T>) {
        this.owner = owner;
    }

    //---------------
    // Load/search.
    //---------------
    async fetchViewInfosAsync(): Promise<ViewInfo[]> {
        const {owner} = this;
        try {
            const blobs = await XH.jsonBlobService.listAsync({
                type: owner.viewType,
                includeValue: false
            });
            return blobs.map(b => new ViewInfo(b, owner));
        } catch (e) {
            throw XH.exception({
                message: `Unable to fetch ${pluralize(owner.typeDisplayName)}`,
                cause: e
            });
        }
    }

    async fetchViewAsync(info: ViewInfo): Promise<View<T>> {
        if (!info) return View.createDefault(this.owner);
        try {
            const blob = await XH.jsonBlobService.getAsync(info.token);
            return View.fromBlob(blob, this.owner);
        } catch (e) {
            throw XH.exception({message: `Unable to fetch ${info.typedName}`, cause: e});
        }
    }

    //-----------------
    // Crud
    //-----------------
    async createViewAsync(name: string, description: string, value: PlainObject): Promise<View<T>> {
        const {owner} = this;
        try {
            const blob = await XH.jsonBlobService.createAsync({
                type: owner.viewType,
                name: name.trim(),
                description: description?.trim(),
                value
            });
            const ret = View.fromBlob(blob, owner);
            this.trackChange('Created View', ret);
            return ret;
        } catch (e) {
            throw XH.exception({message: `Unable to create ${owner.typeDisplayName}`, cause: e});
        }
    }

    async updateViewInfoAsync(
        view: ViewInfo,
        name: string,
        description: string,
        isGlobal: boolean
    ): Promise<View<T>> {
        try {
            const blob = await XH.jsonBlobService.updateAsync(view.token, {
                name: name.trim(),
                description: description?.trim(),
                acl: isGlobal ? '*' : null
            });
            const ret = View.fromBlob(blob, this.owner);
            this.trackChange('Updated View Info', ret);
            return ret;
        } catch (e) {
            throw XH.exception({message: `Unable to update ${view.typedName}`, cause: e});
        }
    }

    async updateViewValueAsync(view: View<T>, value: Partial<T>): Promise<View<T>> {
        try {
            const blob = await XH.jsonBlobService.updateAsync(view.token, {value});
            const ret = View.fromBlob(blob, this.owner);
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

    async deleteViewAsync(view: ViewInfo) {
        try {
            await XH.jsonBlobService.archiveAsync(view.token);
            this.trackChange('Deleted View', view);
        } catch (e) {
            throw XH.exception({message: `Unable to delete ${view.typedName}`, cause: e});
        }
    }

    private trackChange(message: string, v: View | ViewInfo) {
        XH.track({
            message,
            category: 'Views',
            data: {name: v.name, token: v.token, isGlobal: v.isGlobal, type: v.type}
        });
    }
}
