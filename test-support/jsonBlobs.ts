/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
import type {ViewUserState} from '@xh/hoist/cmp/viewmanager';
import type {PlainObject} from '@xh/hoist/core';
import type {JsonBlob} from '@xh/hoist/svc';
import {cloneDeep, forOwn, groupBy, has, isEmpty, isString, omit, pick} from 'lodash';
import type {FakeHoistCore, HoistError} from './hoistCore';

/*
 * The fake hoist-core's JsonBlob store, and the two hoist-core services built on it:
 * `JsonBlobService`, which `XH.jsonBlobService` calls through `XhController`, and `ViewService`,
 * which `ViewManagerModel` calls through `XhViewController`. Views are blobs of the view manager's
 * type. Each user's state for a type - current view, pins, auto-save - is one more blob of that
 * type, named `xhUserState`.
 *
 * The fake answers as those services do, in the shapes `JsonBlob.formatForClient` renders. It lets
 * a user read only the blobs they own or that are shared with all (`acl: '*'`), as the server does.
 * It does not check write access or the uniqueness of names.
 */

/** A JsonBlob as the fake stores it. `meta` is always an object, or null. */
export interface FakeJsonBlob extends JsonBlob {
    meta: PlainObject;
}

/** A JsonBlob to add to the fake, with the fields `JsonBlobService.create` stores. */
export interface JsonBlobSpec {
    type: string;
    name: string;
    /** Defaults to an empty object. */
    value?: any;
    /** Defaults to the current user. Pass `null` for a global blob. */
    owner?: string;
    /** `'*'` to let every user read the blob. */
    acl?: '*';
    meta?: PlainObject;
    description?: string;
    /** Defaults to a generated token. */
    token?: string;
}

/** A ViewManager view to add to the fake, as `ViewService.create` stores it. */
export interface ViewSpec {
    /** The `type` of the `ViewManagerModel` that loads the view. */
    type: string;
    name: string;
    /** Defaults to an empty object. */
    value?: PlainObject;
    group?: string;
    description?: string;
    /** True to let every user read the view. */
    isShared?: boolean;
    /** True for a global view, which has no owner. */
    isGlobal?: boolean;
    /** Defaults to the current user. Ignored for a global view. */
    owner?: string;
    /** Defaults to a generated token. */
    token?: string;
}

/**
 * The JsonBlobs on the fake hoist-core, including ViewManager views and view state. Use the
 * `hoistCore.jsonBlobs` instance. The store starts empty, so a `ViewManagerModel` loads no views
 * and selects its in-code default.
 */
export class FakeJsonBlobStore {
    /**
     * Roles that may write global blobs, by blob type, with `*` for any type not listed - as in
     * hoist-core's `xhJsonBlobConfig`. A view manager reports `manageGlobal` from these and
     * `hoistCore.roles`. List the role `*` to allow every user.
     */
    globalWriteRoles: Record<string, string[]>;

    private blobs: FakeJsonBlob[] = [];
    private nextId = 1;

    constructor(private readonly core: FakeHoistCore) {
        this.reset();
    }

    /** Add a blob, as `JsonBlobService.create` stores it. Returns the stored blob. */
    add(spec: JsonBlobSpec): FakeJsonBlob {
        const {username} = this.core,
            {owner = username, acl = null, meta = null, description = null, value = {}} = spec;
        return this.insert(
            {type: spec.type, name: spec.name, owner, acl, meta, description, value},
            spec.token
        );
    }

    /** Add a ViewManager view, as `ViewService.create` stores it. Returns the stored blob. */
    addView(spec: ViewSpec): FakeJsonBlob {
        return this.insertView(spec, spec.owner ?? this.core.username, spec.token);
    }

    /**
     * Set the current user's state for one view type, as `ViewService.updateState` saves it.
     * Changes only the keys given.
     *
     * @param opts - `viewInstance`, the `instance` of the view manager whose current view is
     *      set. Defaults to 'default'.
     */
    setViewState(type: string, state: Partial<ViewUserState>, opts: {viewInstance?: string} = {}) {
        const {viewInstance = 'default'} = opts,
            blob =
                this.findBlob(type, STATE_BLOB_NAME, this.core.username) ?? this.insertState(type),
            value = blob.value;
        if ('currentView' in state) {
            value.currentView = {...value.currentView, [viewInstance]: state.currentView};
        }
        if ('userPinned' in state) value.userPinned = {...state.userPinned};
        if ('autoSave' in state) value.autoSave = state.autoSave;
    }

    /** The current user's state for one view type, as the server sends it to a view manager. */
    viewState(type: string, viewInstance: string = 'default'): ViewUserState {
        return stateFromBlob(
            this.findBlob(type, STATE_BLOB_NAME, this.core.username),
            viewInstance
        );
    }

    /**
     * The stored blob with a token, archived or not. Change it to model an edit made elsewhere,
     * e.g. advance `lastUpdated` to model a save by another session.
     */
    get(token: string): FakeJsonBlob {
        return this.blobs.find(it => it.token === token) ?? null;
    }

    /** Remove every blob. */
    clear() {
        this.blobs = [];
    }

    /** @internal - empty the store and restore the default `globalWriteRoles`. */
    reset() {
        this.clear();
        this.globalWriteRoles = {'*': ['HOIST_ADMIN']};
    }

    /**
     * @internal - remove the current user's view state for every type, as hoist-core's
     * `xh/clearUserState` does through `ViewService.clearAllState`.
     */
    clearViewState() {
        const {username} = this.core;
        this.blobs = this.blobs.filter(
            it => !(it.name === STATE_BLOB_NAME && it.owner === username)
        );
    }

    /** @internal - the endpoints served by `serve()`, relative to `XH.baseUrl`. */
    get paths(): string[] {
        return Object.keys(this.endpoints);
    }

    /**
     * @internal - answer a request to one of `paths`. Returns the response body, or undefined for
     * an empty 204. Throws a `FakeServerError` for an error response.
     *
     * @param params - the query string and form body merged, as Grails `params` read them.
     * @param json - the parsed JSON body, if any.
     */
    serve(path: string, params: PlainObject, json: any): unknown {
        return this.endpoints[path](params, json);
    }

    //------------------------
    // Implementation
    //------------------------
    // XhController's JsonBlob actions and XhViewController's actions, by path.
    private endpoints: Record<string, (params: PlainObject, json: any) => unknown> = {
        'xh/getJsonBlob': ({token}) => formatForClient(this.getBlob(token)),
        'xh/findJsonBlob': ({type, name, owner = null}) => {
            const ret = this.findBlob(type, name, owner);
            return ret ? formatForClient(ret) : null;
        },
        'xh/listJsonBlobs': ({type, includeValue}) =>
            this.listBlobs(type).map(it => formatForClient(it, includeValue === 'true')),
        'xh/createJsonBlob': ({data}) => formatForClient(this.createBlob(JSON.parse(data))),
        'xh/updateJsonBlob': ({token, update}) =>
            formatForClient(this.updateBlob(this.getBlob(token), JSON.parse(update))),
        'xh/createOrUpdateJsonBlob': ({type, name, update}) =>
            formatForClient(this.createOrUpdateBlob(type, name, JSON.parse(update))),
        'xh/archiveJsonBlob': ({token}) => formatForClient(this.archiveBlob(token)),

        'xhView/allData': ({type, viewInstance}) => this.getAllData(type, viewInstance),
        'xhView/updateState': ({type, viewInstance}, json) =>
            this.updateState(type, viewInstance, json),
        'xhView/get': ({token}) => formatForClient(this.getBlob(token)),
        'xhView/create': (_, json) => this.createView(json),
        'xhView/delete': ({tokens}) => this.deleteViews(tokens.split(',')),
        'xhView/updateInfo': ({token}, json) => this.updateViewInfo(token, json),
        'xhView/bulkUpdateInfo': ({tokens}, json) =>
            this.bulkUpdateViewInfo(tokens.split(','), json),
        'xhView/updateValue': ({token}, json) =>
            formatForClient(this.updateBlob(this.getBlob(token), {value: json})),
        'xhView/renameGroup': ({type}, {from, to, isGlobal}) =>
            this.renameGroup(type, isGlobal ? null : this.core.username, from, to)
    };

    //------------------------------------
    // ViewService
    //------------------------------------
    private getAllData(type: string, viewInstance: string): PlainObject {
        const blobs = this.listBlobs(type),
            state = blobs.find(it => it.name === STATE_BLOB_NAME);
        return {
            state: stateFromBlob(state, viewInstance),
            views: blobs.filter(it => it !== state).map(it => formatForClient(it, false)),
            manageGlobal: this.canWriteGlobal(type)
        };
    }

    private updateState(type: string, viewInstance: string, update: PlainObject): ViewUserState {
        const {username} = this.core,
            curr = this.findBlob(type, STATE_BLOB_NAME, username)?.value,
            value = {
                currentView: {...curr?.currentView},
                userPinned: {...curr?.userPinned},
                autoSave: curr?.autoSave ?? false
            };

        if ('currentView' in update) value.currentView[viewInstance] = update.currentView;
        if ('userPinned' in update) Object.assign(value.userPinned, update.userPinned);
        if ('autoSave' in update) value.autoSave = update.autoSave;

        // Keep pins only for views that exist.
        value.userPinned = pick(
            value.userPinned,
            this.listBlobs(type).map(it => it.token)
        );

        const blob = this.createOrUpdateBlob(type, STATE_BLOB_NAME, {value});
        return stateFromBlob(blob, viewInstance);
    }

    private createView(data: PlainObject): JsonBlob {
        const ret = this.insertView(data as ViewSpec, this.core.username);
        if ('isPinned' in data) this.updatePinned(ret.type, [ret.token], data.isPinned);
        return formatForClient(ret);
    }

    private updateViewInfo(token: string, data: PlainObject): JsonBlob {
        const ret = this.applyViewInfo(token, data);
        if ('isPinned' in data) this.updatePinned(ret.type, [ret.token], data.isPinned);
        return formatForClient(ret);
    }

    // Best effort - updates every view it can, then reports the failures.
    private bulkUpdateViewInfo(tokens: string[], data: PlainObject) {
        const updated: FakeJsonBlob[] = [],
            failures: Record<string, FakeServerError> = {};
        tokens.forEach(token => {
            try {
                updated.push(this.applyViewInfo(token, data));
            } catch (e) {
                if (!(e instanceof FakeServerError)) throw e;
                failures[token] = e;
            }
        });

        if ('isPinned' in data) {
            forOwn(groupBy(updated, 'type'), (blobs, type) =>
                this.updatePinned(
                    type,
                    blobs.map(it => it.token),
                    data.isPinned
                )
            );
        }

        if (!isEmpty(failures)) {
            const detail = Object.entries(failures)
                .map(([token, e]) => `${token}: ${e.message}`)
                .join('; ');
            throw bulkFailure(
                `Failed to update ${Object.keys(failures).length} of ${tokens.length} view(s) - ${detail}`,
                Object.values(failures)
            );
        }
    }

    // Best effort - archives every view it can, then reports the failures.
    private deleteViews(tokens: string[]) {
        const failures: FakeServerError[] = [];
        tokens.forEach(token => {
            try {
                this.archiveBlob(token);
            } catch (e) {
                if (!(e instanceof FakeServerError)) throw e;
                failures.push(e);
            }
        });

        if (failures.length) {
            throw bulkFailure(
                `Failed to delete ${failures.length} view(s) - ${failures[0].message}`,
                failures
            );
        }
    }

    // ViewService.doUpdateInfo - name and description are blob fields, group lives in meta, and
    // isShared and isGlobal set the owner, acl and meta together.
    private applyViewInfo(token: string, data: PlainObject): FakeJsonBlob {
        const blob = this.getBlob(token),
            meta = {...blob.meta},
            core: PlainObject = pick(data, ['name', 'description']);
        if ('group' in data) meta.group = data.group;

        if ('isGlobal' in data || 'isShared' in data) {
            if (data.isGlobal) {
                delete meta.isShared;
                Object.assign(core, {owner: null, acl: '*'});
            } else if (data.isShared) {
                meta.isShared = data.isShared;
                Object.assign(core, {owner: this.core.username, acl: '*'});
            } else {
                meta.isShared = false;
                Object.assign(core, {owner: blob.owner || this.core.username, acl: null});
            }
        }

        return this.updateBlob(blob, {...core, meta});
    }

    private updatePinned(type: string, tokens: string[], isPinned: boolean) {
        const userPinned = Object.fromEntries(tokens.map(it => [it, isPinned]));
        this.updateState(type, 'default', {userPinned});
    }

    private insertView(spec: ViewSpec, owner: string, token?: string): FakeJsonBlob {
        const {
            type,
            name,
            description = null,
            group = null,
            isShared = null,
            isGlobal,
            value = {}
        } = spec;
        return this.insert(
            {
                type,
                name,
                description,
                owner: isGlobal ? null : owner,
                acl: isGlobal || isShared ? '*' : null,
                meta: isGlobal ? {group} : {group, isShared},
                value
            },
            token
        );
    }

    private insertState(type: string): FakeJsonBlob {
        const value = {currentView: {}, userPinned: {}, autoSave: false};
        return this.createBlob({type, name: STATE_BLOB_NAME, value});
    }

    //------------------------------------
    // JsonBlobService
    //------------------------------------
    // An active blob the user can read.
    private getBlob(token: string): FakeJsonBlob {
        const ret = this.blobs.find(it => it.token === token && !it.archived);
        if (!ret) throw notFound(token);
        this.ensureReadable(ret);
        return ret;
    }

    // An active blob by type, name and owner - a null owner matches only global blobs.
    private findBlob(type: string, name: string, owner: string): FakeJsonBlob {
        const ret = this.blobs.find(
            it => it.type === type && it.name === name && it.owner === owner && !it.archived
        );
        if (ret) this.ensureReadable(ret);
        return ret ?? null;
    }

    private listBlobs(type: string): FakeJsonBlob[] {
        return this.blobs.filter(it => it.type === type && !it.archived && this.canRead(it));
    }

    private createBlob(data: PlainObject): FakeJsonBlob {
        const {username} = this.core;
        return this.insert({
            owner: username,
            acl: null,
            meta: null,
            description: null,
            ...pick(data, CREATABLE_FIELDS)
        });
    }

    // Applies the updatable fields given. An empty update changes nothing, not even the stamp.
    private updateBlob(blob: FakeJsonBlob, data: PlainObject): FakeJsonBlob {
        if (isEmpty(data)) return blob;
        Object.assign(blob, cloneDeep(pick(data, UPDATABLE_FIELDS)), {
            lastUpdated: Date.now(),
            lastUpdatedBy: this.core.username
        });
        return blob;
    }

    private createOrUpdateBlob(type: string, name: string, data: PlainObject): FakeJsonBlob {
        const blob = this.findBlob(type, name, this.core.username);
        return blob ? this.updateBlob(blob, data) : this.createBlob({...data, type, name});
    }

    // Soft delete, recorded against the authenticated user - the admin, when impersonating.
    private archiveBlob(token: string): FakeJsonBlob {
        const blob = this.getBlob(token),
            now = Date.now();
        return Object.assign(blob, {
            archived: true,
            archivedDate: now,
            lastUpdated: now,
            lastUpdatedBy: this.core.authUser?.username ?? this.core.username
        });
    }

    // Rewrites the group, and every group nested under it, of the active blobs of one owner -
    // null for global blobs.
    private renameGroup(type: string, owner: string, from: string, to: string): PlainObject {
        from = from?.trim();
        to = to?.trim();
        let count = 0;
        this.blobs.forEach(blob => {
            const group = blob.meta?.group;
            if (blob.type !== type || blob.owner !== owner || blob.archived) return;
            if (!isString(group) || (group !== from && !group.startsWith(from + '/'))) return;

            const renamed = to + group.substring(from.length);
            if (renamed === group) return;
            blob.meta.group = renamed;
            Object.assign(blob, {lastUpdated: Date.now(), lastUpdatedBy: this.core.username});
            count++;
        });
        return {count};
    }

    private canRead(blob: FakeJsonBlob): boolean {
        return blob.acl === '*' || blob.owner === this.core.username;
    }

    private ensureReadable(blob: FakeJsonBlob) {
        if (!this.canRead(blob)) throw notAuthorized(this.core.username, blob.token);
    }

    // A type's own entry in globalWriteRoles, even an empty one, replaces the `*` fallback.
    private canWriteGlobal(type: string): boolean {
        const {globalWriteRoles} = this,
            required = has(globalWriteRoles, type) ? globalWriteRoles[type] : globalWriteRoles['*'];
        if (isEmpty(required)) return false;
        return required.includes('*') || required.some(it => this.core.roles.includes(it));
    }

    private insert(fields: PlainObject, token: string = this.newToken()): FakeJsonBlob {
        const now = Date.now(),
            ret = {
                ...cloneDeep(fields),
                id: this.nextId++,
                token,
                archived: false,
                archivedDate: 0,
                dateCreated: now,
                lastUpdated: now,
                lastUpdatedBy: this.core.username
            } as FakeJsonBlob;
        this.blobs.push(ret);
        return ret;
    }

    // hoist-core generates 8-character tokens. Skips any token a spec has already used.
    private newToken(): string {
        let seq = this.nextId,
            ret: string;
        do {
            ret = 'tok' + String(seq++).padStart(5, '0');
        } while (this.get(ret));
        return ret;
    }
}

/**
 * @internal - an error that the fake renders as hoist-core would, with `hoistError()`.
 */
export class FakeServerError extends Error {
    constructor(
        readonly status: number,
        readonly error: HoistError
    ) {
        super(error.message);
    }
}

//------------------------
// Implementation
//------------------------
const STATE_BLOB_NAME = 'xhUserState',
    UPDATABLE_FIELDS = ['name', 'description', 'value', 'meta', 'owner', 'acl'],
    CREATABLE_FIELDS = ['type', ...UPDATABLE_FIELDS];

// JsonBlob.formatForClient - a copy, so later changes to the store do not reach the client.
function formatForClient(blob: JsonBlob, includeValue: boolean = true): JsonBlob {
    const ret = cloneDeep(blob);
    return includeValue ? ret : (omit(ret, 'value') as JsonBlob);
}

// ViewService.getStateFromBlob - `currentView` is sent only once saved for the instance.
function stateFromBlob(blob: FakeJsonBlob, viewInstance: string): ViewUserState {
    const raw = blob?.value,
        ret: ViewUserState = {userPinned: {...raw?.userPinned}, autoSave: raw?.autoSave ?? false};
    if (has(raw?.currentView, viewInstance)) ret.currentView = raw.currentView[viewInstance];
    return ret;
}

// JsonBlobService.get - a RuntimeException, rendered as a 500.
function notFound(token: string): FakeServerError {
    return new FakeServerError(500, {message: `Active JsonBlob not found with token '${token}'`});
}

function notAuthorized(username: string, token: string): FakeServerError {
    return new FakeServerError(403, {
        name: 'NotAuthorizedException',
        message: `User '${username}' does not have access to JsonBlob with token '${token}'`,
        isRoutine: true
    });
}

// ViewService.bulkFailure - routine only if every failure was routine.
function bulkFailure(message: string, failures: FakeServerError[]): FakeServerError {
    return failures.every(it => it.error.isRoutine)
        ? new FakeServerError(400, {name: 'RoutineRuntimeException', message, isRoutine: true})
        : new FakeServerError(500, {message, cause: failures[0].message});
}
