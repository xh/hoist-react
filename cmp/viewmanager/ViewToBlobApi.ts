/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {PlainObject, XH} from '@xh/hoist/core';
import {pluralize, throwIf} from '@xh/hoist/utils/js';
import {isEmpty, omit, pick, pickBy, isEqual} from 'lodash';
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

export interface ViewUserState {
    currentView?: string;
    userPinned?: Record<string, boolean>;
    autoSave?: boolean;
}

const STATE_BLOB_NAME = 'xhUserState';

/**
 * Class for accessing and updating views using {@link JsonBlobService}.
 * @internal
 */
export class ViewToBlobApi<T> {
    private readonly model: ViewManagerModel<T>;

    constructor(model: ViewManagerModel<T>) {
        this.model = model;
    }

    //---------------
    // Load/search.
    //---------------
    /** Fetch metadata for all views accessible by current user. */
    async fetchViewInfosAsync(): Promise<ViewInfo[]> {
        const {model} = this;
        try {
            const blobs = await XH.jsonBlobService.listAsync({
                type: model.type,
                includeValue: false
            });
            return blobs
                .filter(b => b.name != STATE_BLOB_NAME)
                .map(b => new ViewInfo(b, model))
                .filter(
                    view =>
                        (model.enableGlobal || !view.isGlobal) &&
                        (model.enableSharing || !view.isShared)
                );
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
    // CRUD
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

    /** Update all aspects of a view's metadata.*/
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
            this.trackChange('Made View Global', ret);
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

    async deleteViewsAsync(views: ViewInfo[]) {
        views.forEach(v => this.ensureEditable(v));
        const results = await Promise.allSettled(
                views.map(v => XH.jsonBlobService.archiveAsync(v.token))
            ),
            outcome = results.map((result, idx) => ({result, view: views[idx]})),
            failed = outcome.filter(({result}) => result.status === 'rejected') as Array<{
                result: PromiseRejectedResult;
                view: ViewInfo;
            }>;

        this.trackChange(`Deleted ${pluralize('View', views.length - failed.length, true)}`);

        if (!isEmpty(failed)) {
            throw XH.exception({
                message: `Failed to delete ${pluralize(this.model.typeDisplayName, failed.length, true)}: ${failed.map(({view}) => view.name).join(', ')}`,
                cause: failed.map(({result}) => result.reason)
            });
        }
    }

    //--------------------------
    // State related changes
    //--------------------------
    async getStateAsync(): Promise<ViewUserState> {
        const raw = await this.getRawState();
        return {
            currentView: raw.currentViews?.[this.model.instance],
            userPinned: raw.userPinned,
            autoSave: raw.autoSave
        };
    }

    async updateStateAsync() {
        let {views, autoSave, view, userPinned, instance, type} = this.model;
        userPinned = !isEmpty(views) // Clean state iff views loaded!
            ? pickBy(userPinned, (_, tkn) => views.some(v => v.token === tkn))
            : userPinned;
        const raw = await this.getRawState(),
            newRaw = {
                currentViews: {...raw.currentViews, [instance]: view.token},
                userPinned,
                autoSave
            };

        if (!isEqual(raw, newRaw)) {
            await XH.jsonBlobService.createOrUpdateAsync(type, STATE_BLOB_NAME, {value: newRaw});
        }
    }

    //------------------
    // Implementation
    //------------------
    private async getRawState(): Promise<PlainObject> {
        const ret = await XH.jsonBlobService.findAsync(this.model.type, STATE_BLOB_NAME);
        return ret ? ret.value : {autoSave: false, userPinned: {}, currentViews: {}};
    }

    private trackChange(message: string, v?: View | ViewInfo) {
        XH.track({
            message,
            category: 'Views',
            data: pick(v, ['name', 'token', 'isGlobal', 'type'])
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
