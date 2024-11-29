/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
 */

import {fragment, li, p, ul} from '@xh/hoist/cmp/layout';
import {
    ExceptionHandlerOptions,
    HoistModel,
    LoadSpec,
    managed,
    Persistable,
    PersistableState,
    PersistenceProvider,
    PersistOptions,
    PlainObject,
    TaskObserver,
    Thunkable,
    XH
} from '@xh/hoist/core';
import type {ViewManagerProvider} from '../provider/ViewManagerProvider';
import {genDisplayName} from '@xh/hoist/data';
import {fmtDateTime} from '@xh/hoist/format';
import {action, makeObservable, observable, runInAction, when} from '@xh/hoist/mobx';
import {executeIfFunction, pluralize, throwIf} from '@xh/hoist/utils/js';
import {find, first, isEmpty, isEqual, isNil, lowerCase, without} from 'lodash';
import {SaveAsDialogModel} from './SaveAsDialogModel';
import {ViewInfo} from './ViewInfo';
import {View} from './View';
import {buildViewTree} from './impl/BuildViewTree';

export interface ViewManagerConfig {
    /**
     * True (default) to allow the user to select a "Default" option that restores all persisted
     * objects to their in-code defaults. If not enabled, at least one saved view should be created
     * in advance, so that there is a clear initial selection for users without any private views.
     */
    enableDefault?: boolean;
    /** True (default) to allow user to mark views as favorites. Requires `persistWith`. */
    enableFavorites?: boolean;
    /**
     * True to allow the user to publish or edit the global views. Apps are expected to
     * commonly set this based on user roles - e.g. `XH.getUser().hasRole('MANAGE_GRID_VIEWS')`.
     */
    manageGlobal?: Thunkable<boolean>;

    /** Used to persist the user's last selected view + favorite views */
    persistWith?: ViewManagerPersistOptions;

    /**
     * Required discriminator for the particular class of views to be loaded and managed by this
     * model. Set to something descriptive and specific enough to be identifiable and allow for
     * different viewManagers to be added to your app in the future - e.g. `portfolioGridView` or
     * `tradeBlotterDashboard`.
     */
    viewType: string;

    /**
     * Optional user-facing display name for the view type, displayed in the ViewManager menu
     * and associated management dialogs and prompts. Defaulted from `viewType` if not provided.
     */
    typeDisplayName?: string;

    /**
     * Optional user-facing display name for describing global views. Defaults to 'global'
     */
    globalDisplayName?: string;
}

export interface ViewManagerPersistOptions extends PersistOptions {
    /** Save the pending (unsaved) value in state. Default is true. */
    persistPendingValue?: boolean;
}

/**
 *  ViewManagerModel coordinates the loading, saving, and management of user-defined bundles of
 *  {@link Persistable} component/model state.
 *
 *  - Models to be persisted are bound to this model via their `persistWith` config. One or more
 *    models can be bound to a single ViewManagerModel, allowing a single view to capture the state
 *    of multiple components - e.g. grouping and filtering options along with grid state.
 *  - Views are persisted back to the server as JsonBlob objects.
 *  - Views can be private to their owner, or optionally enabled for global use by (all) other users.
 *  - Views can be marked as favorites for quick access.
 *  - See the desktop {@link ViewManager} component - the initial Hoist UI for this model.
 */
export class ViewManagerModel<T = PlainObject>
    extends HoistModel
    implements Persistable<ViewManagerModelPersistState<T>>
{
    /**
     * Factory to create new instances of this model and await its initial load before binding to
     * any persistable component models. This ensures that bound models will have the expected
     * initial persisted state applied within their constructor, before their components have
     * rendered, and avoids thrashing of component state during initial load.
     *
     * To minimize the impact this async requirement has on the design and lifecycle of individual
     * components within an app, consider eagerly constructing any viewManagerModels required within
     * your `AppModel.initAsync` method and saving a reference to them there for component models
     * to then use when they are mounted. The VM model instances will then be "ready to go" and
     * usable within model constructors. (Initializing and referencing from one or more app
     * services would be another, similar option.)
     *
     * Note that this method may throw if the ViewManager cannot be initialized successfully,
     * but should generally fail quietly due to the early instantiation.
     */
    static async createAsync(config: ViewManagerConfig): Promise<ViewManagerModel> {
        const ret = new ViewManagerModel(config);
        await ret.initAsync();
        return ret;
    }

    /** Immutable configuration for this model. */
    readonly viewType: string;
    readonly typeDisplayName: string;
    readonly globalDisplayName: string;
    readonly enableDefault: boolean;
    readonly enableFavorites: boolean;
    readonly manageGlobal: boolean;

    /** Current view. Will not include uncommitted changes */
    @observable.ref view: View<T> = View.createDefault();
    /** Loaded saved view library - both private and global */
    @observable.ref views: ViewInfo[] = [];
    /** List of tokens for the user's favorite views. */
    @observable.ref favorites: string[] = [];

    /**
     * TaskObserver linked to {@link selectViewAsync}. If a change to the active view is likely to
     * require intensive layout/grid work, consider masking affected components with this task.
     */
    selectTask: TaskObserver;

    /**
     * TaskObserver linked to {@link saveAsync}.
     */
    saveTask: TaskObserver;

    @observable manageDialogOpen = false;
    @managed readonly saveAsDialogModel: SaveAsDialogModel;

    // Unsaved changes on the current view.
    @observable.ref
    private pendingValue: PendingValue<T> = null;

    /**
     * @internal array of {@link ViewManagerProvider} instances bound to this model. Providers will
     * push themselves onto this array when constructed with a reference to this model. Used to
     * proactively push state to the target components when the model's selected `value` changes.
     */
    providers: ViewManagerProvider<any>[] = [];

    declare persistWith: ViewManagerPersistOptions;

    get isValueDirty(): boolean {
        return !!this.pendingValue;
    }

    get isViewSavable(): boolean {
        const {view, manageGlobal} = this;
        return !view.isDefault && (manageGlobal || !view.isGlobal);
    }

    get favoriteViews(): ViewInfo[] {
        return this.views.filter(it => it.isFavorite);
    }

    get globalViews(): ViewInfo[] {
        return this.views.filter(it => it.isGlobal);
    }

    get privateViews(): ViewInfo[] {
        return this.views.filter(it => !it.isGlobal);
    }

    get globalViewTree(): ViewTree[] {
        return buildViewTree(this.globalViews, this);
    }

    get privateViewTree(): ViewTree[] {
        return buildViewTree(this.privateViews, this);
    }

    /** True if any async tasks are pending. */
    get isLoading(): boolean {
        const {loadModel, saveTask, selectTask} = this;
        return loadModel.isPending || saveTask.isPending || selectTask.isPending;
    }

    /**
     * Use the static {@link createAsync} factory to create an instance of this model and await its
     * initial load before binding to persistable components.
     */
    private constructor({
        viewType,
        typeDisplayName,
        globalDisplayName = 'global',
        persistWith,
        manageGlobal = false,
        enableDefault = true,
        enableFavorites = true
    }: ViewManagerConfig) {
        super();
        makeObservable(this);

        throwIf(!viewType, 'Missing required viewType in ViewManagerModel config.');
        this.viewType = viewType;
        this.typeDisplayName = lowerCase(typeDisplayName ?? genDisplayName(viewType));
        this.globalDisplayName = globalDisplayName;
        this.persistWith = {persistPendingValue: true, ...persistWith};
        this.manageGlobal = executeIfFunction(manageGlobal) ?? false;
        this.enableDefault = enableDefault;
        this.enableFavorites = enableFavorites && !!persistWith;
        this.saveAsDialogModel = new SaveAsDialogModel(this);

        this.selectTask = TaskObserver.trackLast({
            message: `Updating ${this.typeDisplayName}...`
        });
        this.saveTask = TaskObserver.trackLast({
            message: `Saving ${this.typeDisplayName}...`
        });
    }

    private async initAsync() {
        try {
            const views = await this.fetchViewInfosAsync();

            runInAction(() => (this.views = views));

            // Setup persistence
            if (this.persistWith) {
                PersistenceProvider.create({
                    persistOptions: {
                        path: 'viewManager',
                        ...this.persistWith
                    },
                    target: this
                });
                await when(() => !this.selectTask.isPending);
            }

            if (this.view.isDefault && !this.enableDefault && !isEmpty(views)) {
                await this.loadViewAsync(first(views));
            }
        } catch (e) {
            this.handleException(e, {showAlert: false, logOnServer: true});
        }
    }

    override async doLoadAsync(loadSpec: LoadSpec) {
        try {
            // 1) Update all view info
            const views = await this.fetchViewInfosAsync();
            if (loadSpec.isStale) return;
            runInAction(() => (this.views = views));

            // 2) Update active view if needed.
            const {view} = this;
            if (!view.isDefault) {
                const latestInfo = find(views, {token: view.token});
                // If no longer present, leave as is for saveAs recovery.
                if (latestInfo && latestInfo.lastUpdated > view.lastUpdated) {
                    this.loadViewAsync(latestInfo, this.pendingValue);
                }
            }
        } catch (e) {
            if (loadSpec.isStale) return;
            this.handleException(e, {showAlert: false});
        }
    }

    async selectViewAsync(info: ViewInfo): Promise<void> {
        if (this.isValueDirty && !(await this.confirmDiscardChangesAsync())) return;

        await this.loadViewAsync(info).catch(e => this.handleException(e));
    }

    //------------------------
    // Saving/resetting
    //------------------------
    async saveAsync(): Promise<void> {
        if (!this.pendingValue || !this.isViewSavable || this.isLoading) {
            this.logError('Unexpected conditions for call to save, skipping');
            return;
        }
        const {pendingValue} = this,
            {info} = this.view;
        try {
            if (!(await this.maybeConfirmSaveAsync(info, pendingValue))) {
                return;
            }
            const update = await XH.jsonBlobService
                .updateAsync(info.token, {value: pendingValue.value})
                .linkTo(this.saveTask);

            this.setAsClean(View.fromBlob(update, this));
            this.noteSuccess(`Saved ${info.typedName}`);
        } catch (e) {
            this.handleException(e, {
                message: `Failed to save ${info.typedName}.  If this persists consider \`Save As...\`.`
            });
            return;
        }

        this.refreshAsync();
    }

    async saveAsAsync(): Promise<void> {
        const view = (await this.saveAsDialogModel.openAsync()) as View<T>;
        if (view) {
            this.setAsClean(view);
            this.noteSuccess(`Saved ${view.info.typedName}`);
        }
        this.refreshAsync();
    }

    async resetAsync(): Promise<void> {
        await this.loadViewAsync(this.view.info).catch(e => this.handleException(e));
    }

    //--------------------------------
    // Access for Provider/Components
    //--------------------------------
    getValue(): Partial<T> {
        return this.pendingValue ? this.pendingValue.value : this.view.value;
    }

    @action
    setValue(value: Partial<T>) {
        const {view, pendingValue} = this;
        value = this.cleanState(value);

        this.pendingValue = !isEqual(value, view.value)
            ? {value, baseUpdated: pendingValue ? pendingValue.baseUpdated : view?.lastUpdated}
            : null;
    }

    //------------------
    // Favorites
    //------------------
    toggleFavorite(token: string) {
        this.isFavorite(token) ? this.removeFavorite(token) : this.addFavorite(token);
    }

    @action
    addFavorite(token: string) {
        this.favorites = [...this.favorites, token];
    }

    @action
    removeFavorite(token: string) {
        this.favorites = without(this.favorites, token);
    }

    isFavorite(token: string) {
        return this.favorites.includes(token);
    }

    //------------------
    // Persistence
    //------------------
    getPersistableState(): PersistableState<ViewManagerModelPersistState<T>> {
        const state: ViewManagerModelPersistState<T> = {token: this.view.token};
        if (this.persistWith.persistPendingValue) {
            state.pendingValue = this.pendingValue;
        }
        if (this.enableFavorites) {
            state.favorites = this.favorites;
        }
        return new PersistableState(state);
    }

    @action
    async setPersistableState(state: PersistableState<ViewManagerModelPersistState<T>>) {
        const {views} = this,
            {value} = state,
            token = value.token,
            pendingValue = this.persistWith.persistPendingValue ? value.pendingValue : null,
            favorites = this.enableFavorites ? value.favorites : null;

        if (favorites) {
            this.favorites = favorites.filter(tkn => views.some(v => v.token === tkn));
        }

        // Requesting default or a view still available -- load it with pending value.
        if (!token) return this.loadViewAsync(null, pendingValue);
        const viewInfo = find(this.views, {token});
        if (viewInfo) {
            try {
                return await this.loadViewAsync(viewInfo, pendingValue);
            } catch (e) {
                this.logError('Failure loading persisted value', e);
            }
        }

        // ...otherwise, make best effort to preserve pending value on default
        this.logWarn('Persisted view not found, it may have been deleted.');
        if (pendingValue && this.enableDefault) {
            this.loadViewAsync(null, pendingValue);
        }
    }

    //-----------------
    // Misc
    //-----------------
    @action
    openManageDialog() {
        this.manageDialogOpen = true;
        this.refreshAsync();
    }

    @action
    closeManageDialog() {
        this.manageDialogOpen = false;
    }

    //------------------
    // Implementation
    //------------------
    private loadViewAsync(info: ViewInfo, pendingValue: PendingValue<T> = null): Promise<void> {
        return this.fetchViewAsync(info)
            .thenAction(latest => {
                this.view = latest;
                this.pendingValue = pendingValue;
                this.providers.forEach(it => it.pushStateToTarget());
            })
            .linkTo(this.selectTask);
    }

    private async fetchViewAsync(info: ViewInfo): Promise<View<T>> {
        if (!info) return View.createDefault();
        try {
            const blob = await XH.jsonBlobService.getAsync(info.token);
            return View.fromBlob(blob, this);
        } catch (e) {
            throw XH.exception({
                message: `Unable to fetch ${this.typeDisplayName} '${info.name}'`,
                cause: e
            });
        }
    }

    private async fetchViewInfosAsync(): Promise<ViewInfo[]> {
        try {
            const blobs = await XH.jsonBlobService.listAsync({
                type: this.viewType,
                includeValue: false
            });
            return blobs.map(b => new ViewInfo(b, this));
        } catch (e) {
            throw XH.exception({
                message: `Unable to fetch ${pluralize(this.typeDisplayName)}`,
                cause: e
            });
        }
    }

    @action
    private setAsClean(view: View<T>) {
        this.view = view;
        this.pendingValue = null;
    }

    private handleException(e, opts: ExceptionHandlerOptions = {}) {
        XH.handleException(e, opts);
    }

    private noteSuccess(msg: string) {
        XH.successToast(msg);
    }

    /**
     * Stringify and parse to ensure that any value set here is valid, serializable JSON.
     */
    private cleanState(state: Partial<T>): Partial<T> {
        if (isNil(state)) state = {};
        return JSON.parse(JSON.stringify(state));
    }

    private async confirmDiscardChangesAsync() {
        // TODO - offer save option here as well
        return XH.confirm({
            message: `You have unsaved changes. Discard them and continue to switch ${pluralize(this.typeDisplayName)}?`,
            confirmProps: {
                text: 'Discard changes',
                intent: 'danger'
            },
            cancelProps: {
                text: 'Cancel',
                autoFocus: true
            }
        });
    }

    private async maybeConfirmSaveAsync(info: ViewInfo, pendingValue: PendingValue<T>) {
        // Get latest from server for reference
        const latest = await this.fetchViewAsync(info),
            isGlobal = latest.isGlobal,
            isStale = latest.lastUpdated > pendingValue.baseUpdated;
        if (!isStale && !isGlobal) return true;

        const latestInfo = latest.info,
            {typeDisplayName, globalDisplayName} = this,
            messages = [];
        if (isGlobal) {
            messages.push(
                `This is a ${globalDisplayName} ${typeDisplayName}. ` +
                    `Changes will be visible to ALL users.`
            );
        }
        if (isStale) {
            messages.push(
                `This ${typeDisplayName} was updated by ${latestInfo.lastUpdatedBy} on ` +
                    `${fmtDateTime(latestInfo.lastUpdated)}.  Your change may override those changes.`
            );
        }

        return XH.confirm({
            message: fragment(p(`Save ${info.typedName}?`), ul(messages.map(it => li(it)))),
            confirmProps: {
                text: 'Yes, save changes',
                intent: 'primary',
                outlined: true
            },
            cancelProps: {
                text: 'Cancel',
                autoFocus: true
            }
        });
    }
}

/**
 * Abstract representation of ViewManager views available for selection, potentially grouped into
 * hierarchical folders. Lightweight, user-driven organization into "folders" is supported by
 * inserting a "\" in the name of any view.
 */
export type ViewTree = {
    selected: boolean;
    data: ViewInfo | {folderName: string; children: ViewTree[]};
};

export interface ViewManagerModelPersistState<T> {
    token: string;
    pendingValue?: PendingValue<T>;
    favorites?: string[];
}

interface PendingValue<T> {
    baseUpdated: number;
    value: Partial<T>;
}
